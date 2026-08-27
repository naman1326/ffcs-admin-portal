import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { Member, AttendanceStatus, MeetingAttendance, EventAttendance } from "../types";
import { api, friendlyError } from "../lib/api";

type Scope = "meeting" | "event";
type AttendanceRecord = MeetingAttendance | EventAttendance;

export default function AttendanceMarker({ scope, scopeId }: { scope: Scope; scopeId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");

  const collectionName = scope === "meeting" ? "meetingAttendance" : "eventAttendance";
  const scopeField = scope === "meeting" ? "meetingId" : "eventId";

  async function reload() {
    const [membersSnap, attSnap] = await Promise.all([
      getDocs(query(collection(db, "members"), where("isActive", "==", true))),
      getDocs(query(collection(db, collectionName), where(scopeField, "==", scopeId))),
    ]);
    setMembers(membersSnap.docs.map((d) => d.data() as Member).sort((a, b) => a.name.localeCompare(b.name)));
    const map = new Map<string, AttendanceRecord>();
    attSnap.docs.forEach((d) => map.set((d.data() as AttendanceRecord).memberId, d.data() as AttendanceRecord));
    setRecords(map);
    setLoading(false);
  }

  useEffect(() => {
    reload().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId]);

  async function handleBulk(defaultStatus: "Present" | "Absent") {
    setBulkBusy(true);
    try {
      await api.bulkSetAttendance({ scope, scopeId, defaultStatus });
      toast.success(`All active members marked as ${defaultStatus}.`);
      await reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleSetStatus(memberId: string, status: AttendanceStatus) {
    if (status === "Other") {
      setReasonDrafts((prev) => new Map(prev).set(memberId, prev.get(memberId) ?? ""));
      return;
    }
    setSavingId(memberId);
    try {
      await api.setAttendance({ scope, scopeId, memberId, status, otherReason: null });
      await reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveOther(memberId: string) {
    const reason = reasonDrafts.get(memberId)?.trim();
    if (!reason) return toast.error("Please provide a reason for 'Other'.");
    setSavingId(memberId);
    try {
      await api.setAttendance({ scope, scopeId, memberId, status: "Other", otherReason: reason });
      setReasonDrafts((prev) => {
        const next = new Map(prev);
        next.delete(memberId);
        return next;
      });
      await reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSavingId(null);
    }
  }

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.registrationNumber.toLowerCase().includes(q)
    );
  }, [members, search]);

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ width: "50%", marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "100%", height: 120 }} />
      </div>
    );
  }

  const marked = records.size;
  const present = [...records.values()].filter((r) => r.status === "Present").length;
  const absent = [...records.values()].filter((r) => r.status === "Absent").length;
  const other = [...records.values()].filter((r) => r.status === "Other").length;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h2>Attendance Roster</h2>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {marked} of {members.length} FFCS members marked · <span style={{ color: "var(--confirm)", fontWeight: 600 }}>{present} Present</span> · <span style={{ color: "var(--duplicate)", fontWeight: 600 }}>{absent} Absent</span> · <span style={{ color: "var(--error)", fontWeight: 600 }}>{other} Other</span>
          </p>
        </div>

        <div className="btn-row">
          <button className="btn btn-sm btn-primary" disabled={bulkBusy} onClick={() => handleBulk("Present")}>
            ✓ Mark All Present
          </button>
          <button className="btn btn-sm btn-danger" disabled={bulkBusy} onClick={() => handleBulk("Absent")}>
            ✕ Mark All Absent
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="search-wrapper" style={{ maxWidth: 300 }}>
          <span className="search-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            placeholder="Filter members by name/reg..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>FFCS Member</th>
              <th>Reg. Number</th>
              <th>Status</th>
              <th>Reason (if Other)</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => {
              const record = records.get(m.memberId);
              const status = record?.status;
              const isOther = status === "Other" || reasonDrafts.has(m.memberId);
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
                  <td>
                    <select
                      value={status ?? ""}
                      disabled={savingId === m.memberId}
                      onChange={(e) => handleSetStatus(m.memberId, e.target.value as AttendanceStatus)}
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.84rem",
                        maxWidth: 140,
                        borderColor: status === "Present" ? "rgba(31, 174, 95, 0.4)" : status === "Absent" ? "rgba(226, 73, 58, 0.4)" : undefined,
                      }}
                    >
                      <option value="" disabled>Not marked</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Other">Other</option>
                    </select>
                  </td>
                  <td>
                    {isOther ? (
                      <div className="btn-row">
                        <input
                          style={{ minWidth: 200, padding: "5px 10px", fontSize: "0.84rem" }}
                          value={reasonDrafts.get(m.memberId) ?? record?.otherReason ?? ""}
                          onChange={(e) => setReasonDrafts((prev) => new Map(prev).set(m.memberId, e.target.value))}
                          placeholder="e.g. Official College Duty, OD"
                        />
                        <button className="btn btn-sm btn-primary" disabled={savingId === m.memberId} onClick={() => handleSaveOther(m.memberId)}>
                          {savingId === m.memberId ? "Saving..." : "Save"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <p className="empty-state">No active FFCS members found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
