import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import toast from "react-hot-toast";
import { auth, db } from "../firebase";
import { Member, Role, Meeting, ClubEvent, MeetingAttendance, EventAttendance } from "../types";
import { api, friendlyError } from "../lib/api";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import BulkImport from "../components/BulkImport";

type FilterTab = "all" | "active" | "inactive" | "member" | "admin";

export default function Members() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [meetingAttendance, setMeetingAttendance] = useState<MeetingAttendance[]>([]);
  const [eventAttendance, setEventAttendance] = useState<EventAttendance[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ member: Member; action: "activate" | "deactivate" } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubMembers = onSnapshot(query(collection(db, "members"), orderBy("name")), (snap) => {
      setMembers(snap.docs.map((d) => d.data() as Member));
    });
    const unsubMeetings = onSnapshot(collection(db, "meetings"), (snap) => {
      setMeetings(snap.docs.map((d) => d.data() as Meeting));
    });
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      setEvents(snap.docs.map((d) => d.data() as ClubEvent));
    });
    const unsubMeetingAtt = onSnapshot(collection(db, "meetingAttendance"), (snap) => {
      setMeetingAttendance(snap.docs.map((d) => d.data() as MeetingAttendance));
    });
    const unsubEventAtt = onSnapshot(collection(db, "eventAttendance"), (snap) => {
      setEventAttendance(snap.docs.map((d) => d.data() as EventAttendance));
    });

    return () => {
      unsubMembers();
      unsubMeetings();
      unsubEvents();
      unsubMeetingAtt();
      unsubEventAtt();
    };
  }, []);

  const attendanceMap = useMemo(() => {
    const validMeetings = meetings.filter((m) => m.status !== "cancelled");
    const validEvents = events.filter((e) => e.status !== "cancelled" && e.status !== "draft");
    const validMeetingIds = new Set(validMeetings.map((m) => m.meetingId));
    const validEventIds = new Set(validEvents.map((e) => e.eventId));

    const totalMeetings = validMeetings.length;
    const totalEvents = validEvents.length;
    const totalItems = totalMeetings + totalEvents;

    const memberMeetingAtt = new Map<string, number>();
    for (const rec of meetingAttendance) {
      if (rec.status === "Present" && validMeetingIds.has(rec.meetingId)) {
        memberMeetingAtt.set(rec.memberId, (memberMeetingAtt.get(rec.memberId) ?? 0) + 1);
      }
    }

    const memberEventAtt = new Map<string, number>();
    for (const rec of eventAttendance) {
      if (rec.status === "Present" && validEventIds.has(rec.eventId)) {
        memberEventAtt.set(rec.memberId, (memberEventAtt.get(rec.memberId) ?? 0) + 1);
      }
    }

    const map = new Map<
      string,
      {
        meetingsAttended: number;
        totalMeetings: number;
        eventsAttended: number;
        totalEvents: number;
        totalAttended: number;
        totalItems: number;
        meetingsRatio: string;
        percentage: number | null;
        percentageText: string;
      }
    >();

    for (const member of members) {
      const attendedMeetings = memberMeetingAtt.get(member.memberId) ?? 0;
      const attendedEvents = memberEventAtt.get(member.memberId) ?? 0;
      const totalAttended = attendedMeetings + attendedEvents;

      const meetingsRatio = totalMeetings === 0 ? "None" : `${attendedMeetings}/${totalMeetings}`;
      const percentage = totalItems === 0 ? null : Math.round((totalAttended / totalItems) * 100);
      const percentageText = percentage !== null ? `${percentage}%` : "None";

      map.set(member.memberId, {
        meetingsAttended: attendedMeetings,
        totalMeetings,
        eventsAttended: attendedEvents,
        totalEvents,
        totalAttended,
        totalItems,
        meetingsRatio,
        percentage,
        percentageText,
      });
    }

    return map;
  }, [members, meetings, events, meetingAttendance, eventAttendance]);

  const filtered = useMemo(() => {
    let list = members;
    if (filterTab === "active") list = list.filter((m) => m.isActive);
    if (filterTab === "inactive") list = list.filter((m) => !m.isActive);
    if (filterTab === "member") list = list.filter((m) => m.role === "member");
    if (filterTab === "admin") list = list.filter((m) => m.role === "admin");

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.registrationNumber.toLowerCase().includes(q) ||
        m.collegeEmail.toLowerCase().includes(q)
    );
  }, [members, search, filterTab]);

  async function handleRoleChange(member: Member, role: Role) {
    try {
      await api.setMemberRole({ memberId: member.memberId, role });
      const roleLabel = role === "admin" ? "Admin" : "FFCS Member";
      toast.success(`${member.name} is now ${roleLabel}.`);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function handleResendSetupEmail(member: Member) {
    setResendingId(member.memberId);
    try {
      await sendPasswordResetEmail(auth, member.collegeEmail);
      toast.success(`Setup email re-sent to ${member.collegeEmail}.`);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setResendingId(null);
    }
  }

  const activeCount = members.filter((m) => m.isActive).length;
  const inactiveCount = members.length - activeCount;
  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1>FFCS Members</h1>
            <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
              Manage registered FFCS club members, assign permissions, and send setup links.
            </p>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add FFCS Member</span>
            </button>
            <button className="btn" onClick={() => setShowBulkImport(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Bulk Import (CSV/XLSX)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 14 }}>
          <div className="search-wrapper">
            <span className="search-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              placeholder="Search by name, reg. no., or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-chips" style={{ margin: 0 }}>
            <button
              type="button"
              className={`filter-chip ${filterTab === "all" ? "is-active" : ""}`}
              onClick={() => setFilterTab("all")}
            >
              All ({members.length})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterTab === "active" ? "is-active" : ""}`}
              onClick={() => setFilterTab("active")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterTab === "inactive" ? "is-active" : ""}`}
              onClick={() => setFilterTab("inactive")}
            >
              Inactive ({inactiveCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterTab === "member" ? "is-active" : ""}`}
              onClick={() => setFilterTab("member")}
            >
              FFCS Members ({members.length - adminCount})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterTab === "admin" ? "is-active" : ""}`}
              onClick={() => setFilterTab("admin")}
            >
              Admins ({adminCount})
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Reg. Number</th>
                <th>College Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Attendance %</th>
                <th>Meetings Attended</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const att = attendanceMap.get(m.memberId);
                return (
                  <tr key={m.memberId}>
                    <td>
                      <strong style={{ color: "var(--text-primary)" }}>{m.name}</strong>
                    </td>
                    <td>
                      <code style={{ background: "rgba(255, 107, 53, 0.1)", padding: "2px 6px", borderRadius: 4, color: "var(--brand-saffron)" }}>
                        {m.registrationNumber}
                      </code>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{m.collegeEmail}</td>
                    <td>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m, e.target.value as Role)}
                        disabled={m.memberId === user?.uid}
                        style={{ padding: "4px 8px", fontSize: "0.82rem", maxWidth: 140 }}
                      >
                        <option value="member">FFCS Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${m.isActive ? "badge-present" : "badge-absent"}`}>
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {att && att.percentage !== null ? (
                        <span
                          className={`badge ${
                            att.percentage >= 75
                              ? "badge-present"
                              : att.percentage >= 50
                              ? "badge-other"
                              : "badge-absent"
                          }`}
                          title={`${att.totalAttended} of ${att.totalItems} total meetings & events attended (${att.meetingsAttended}/${att.totalMeetings} meetings, ${att.eventsAttended}/${att.totalEvents} events)`}
                        >
                          {att.percentageText}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>None</span>
                      )}
                    </td>
                    <td>
                      {att && att.meetingsRatio !== "None" ? (
                        <code
                          style={{
                            background: "rgba(255, 107, 53, 0.08)",
                            padding: "2px 8px",
                            borderRadius: 4,
                            color: "var(--brand-saffron)",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                          }}
                          title={`${att.meetingsAttended} of ${att.totalMeetings} meetings attended`}
                        >
                          {att.meetingsRatio}
                        </code>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>None</span>
                      )}
                    </td>
                    <td>
                      <div className="btn-row">
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={resendingId === m.memberId}
                          onClick={() => handleResendSetupEmail(m)}
                          title="Re-send password setup email"
                        >
                          {resendingId === m.memberId ? "Sending..." : "Resend Setup"}
                        </button>
                        <button
                          className={`btn btn-sm ${m.isActive ? "btn-danger" : ""}`}
                          onClick={() => setConfirmTarget({ member: m, action: m.isActive ? "deactivate" : "activate" })}
                        >
                          {m.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <p className="empty-state">No FFCS members match your search or filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} />}
      {showBulkImport && <BulkImport onClose={() => setShowBulkImport(false)} />}

      {confirmTarget && (
        <ConfirmModal
          title={`${confirmTarget.action === "activate" ? "Activate" : "Deactivate"} FFCS Member`}
          message={`Are you sure you want to ${confirmTarget.action} ${confirmTarget.member.name} (${confirmTarget.member.registrationNumber})?`}
          confirmLabel={confirmTarget.action === "activate" ? "Activate" : "Deactivate"}
          danger={confirmTarget.action === "deactivate"}
          onClose={() => setConfirmTarget(null)}
          onConfirm={async () => {
            try {
              await api.setMemberActive({ memberId: confirmTarget.member.memberId, isActive: confirmTarget.action === "activate" });
              toast.success(`FFCS member ${confirmTarget.action}d successfully.`);
            } catch (err) {
              toast.error(friendlyError(err));
            }
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await api.createMember({ name, registrationNumber, collegeEmail, role });
      await sendPasswordResetEmail(auth, res.data.collegeEmail);
      toast.success(`${name} added — setup email sent to ${res.data.collegeEmail}.`);
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add FFCS Member" onClose={onClose}>
      <label htmlFor="name">Full Name</label>
      <input id="name" placeholder="e.g. Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} />

      <label htmlFor="regNo">Registration Number</label>
      <input
        id="regNo"
        value={registrationNumber}
        onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
        placeholder="24BCE5051"
      />

      <label htmlFor="email">College Email Address</label>
      <input
        id="email"
        type="email"
        placeholder="rahul.sharma2024@vitstudent.ac.in"
        value={collegeEmail}
        onChange={(e) => setCollegeEmail(e.target.value)}
      />

      <label htmlFor="role">Club Role</label>
      <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        <option value="member">FFCS Member</option>
        <option value="admin">Administrator</option>
      </select>

      <p className="field-hint">
        An invitation and password setup email will be automatically sent to the member's college email address upon creation.
      </p>

      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting || !name || !registrationNumber || !collegeEmail}
        >
          {submitting ? "Adding..." : "Add Member"}
        </button>
      </div>
    </Modal>
  );
}
