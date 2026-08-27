import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { ClubEvent, ExternalEventRegistration, OwnEventRegistration, Member } from "../types";
import { api, friendlyError, fileToBase64 } from "../lib/api";
import AttendanceMarker from "../components/AttendanceMarker";
import ConfirmModal from "../components/ConfirmModal";
import Modal from "../components/Modal";

type Tab = "attendance" | "registrations";

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [tab, setTab] = useState<Tab>("registrations");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    getDoc(doc(db, "events", eventId))
      .then((snap) => setEvent(snap.exists() ? (snap.data() as ClubEvent) : null))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ width: "60%", marginBottom: 12 }} />
        <div className="skeleton" style={{ width: "40%" }} />
      </div>
    );
  }

  if (!event || !eventId) {
    return <div className="card error-state">Event not found.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/events" className="btn btn-sm btn-ghost" style={{ display: "inline-flex", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Events</span>
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: 6 }}>{event.title}</h1>
            {event.description && (
              <p style={{ color: "var(--text-secondary)", margin: "0 0 12px", fontSize: "0.95rem" }}>
                {event.description}
              </p>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{event.date} ({event.startTime} – {event.endTime})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{event.venue}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
                <span>Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <span className={`badge badge-${event.status}`} style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
            {event.status}
          </span>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "registrations" ? "active" : ""} onClick={() => setTab("registrations")}>
          Participant Registrations
        </button>
        <button className={tab === "attendance" ? "active" : ""} onClick={() => setTab("attendance")}>
          FFCS Member Attendance
        </button>
      </div>

      {tab === "attendance" ? <AttendanceMarker scope="event" scopeId={eventId} /> : <RegistrationsPanel eventId={eventId} />}
    </div>
  );
}

function RegistrationsPanel({ eventId }: { eventId: string }) {
  const [external, setExternal] = useState<ExternalEventRegistration[]>([]);
  const [own, setOwn] = useState<OwnEventRegistration[]>([]);
  const [membersById, setMembersById] = useState<Map<string, Member>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: "external" | "own" } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ id: string; kind: "external" | "own" } | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceBusy, setReplaceBusy] = useState(false);

  async function reload() {
    const [externalSnap, ownSnap, membersSnap] = await Promise.all([
      getDocs(query(collection(db, "eventRegistrations"), where("eventId", "==", eventId))),
      getDocs(query(collection(db, "ownEventRegistrations"), where("eventId", "==", eventId))),
      getDocs(collection(db, "members")),
    ]);
    setExternal(externalSnap.docs.map((d) => d.data() as ExternalEventRegistration));
    setOwn(ownSnap.docs.map((d) => d.data() as OwnEventRegistration));
    const map = new Map<string, Member>();
    membersSnap.docs.forEach((d) => map.set(d.id, d.data() as Member));
    setMembersById(map);
    setLoading(false);
  }

  useEffect(() => {
    reload().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleExportCsv() {
    try {
      const res = await api.exportEventRegistrationsCsv({ eventId });
      const blob = new Blob([res.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${eventId}-registrations.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV export downloaded.");
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function handleReplace() {
    if (!replaceTarget || !replaceFile) return;
    setReplaceBusy(true);
    try {
      const fileBase64 = await fileToBase64(replaceFile);
      await api.replaceRegistrationReceipt({ registrationId: replaceTarget.id, kind: replaceTarget.kind, fileBase64 });
      toast.success("Receipt PDF replaced successfully.");
      setReplaceTarget(null);
      setReplaceFile(null);
      await reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setReplaceBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ width: "50%", marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "100%", height: 140 }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={handleExportCsv}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export All Registrations (CSV)</span>
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2>External Student Registrations ({external.length})</h2>
          <span className="badge badge-info">{external.length} registered</span>
        </div>
        <p className="page-subtitle">External students registered through FFCS members.</p>

        {external.length === 0 ? (
          <p className="empty-state">No external registrations recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student Reg. No.</th>
                  <th>Brought by (FFCS Member)</th>
                  <th>Payment / Drive Receipt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {external.map((r) => {
                  const id = `${r.eventId}_${r.studentRegistrationNumber}`;
                  return (
                    <tr key={id}>
                      <td>
                        <code style={{ background: "rgba(255, 107, 53, 0.1)", padding: "2px 6px", borderRadius: 4, color: "var(--brand-saffron)" }}>
                          {r.studentRegistrationNumber}
                        </code>
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {membersById.get(r.broughtByMemberId)?.name ?? r.broughtByMemberId}
                        </strong>
                      </td>
                      <td>
                        {r.status === "complete" ? (
                          <span className="badge badge-complete" title={r.driveFileName ?? undefined}>
                            📄 {r.driveFileName ?? "Receipt uploaded"}
                          </span>
                        ) : (
                          <span className="badge badge-draft">⏳ Processing...</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-row">
                          <button className="btn btn-sm btn-ghost" onClick={() => setReplaceTarget({ id, kind: "external" })}>
                            Replace Receipt
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget({ id, kind: "external" })}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2>FFCS Member Own Registrations ({own.length})</h2>
          <span className="badge badge-ffcs">{own.length} registered</span>
        </div>
        <p className="page-subtitle">Direct registrations by club FFCS members.</p>

        {own.length === 0 ? (
          <p className="empty-state">No member registrations recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>FFCS Member</th>
                  <th>Reg. Number</th>
                  <th>Payment / Drive Receipt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {own.map((r) => {
                  const id = `${r.eventId}_${r.memberId}`;
                  return (
                    <tr key={id}>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {membersById.get(r.memberId)?.name ?? r.memberId}
                        </strong>
                      </td>
                      <td>
                        <code style={{ background: "rgba(255, 107, 53, 0.1)", padding: "2px 6px", borderRadius: 4, color: "var(--brand-saffron)" }}>
                          {r.memberRegistrationNumber}
                        </code>
                      </td>
                      <td>
                        {r.status === "complete" ? (
                          <span className="badge badge-complete" title={r.driveFileName ?? undefined}>
                            📄 {r.driveFileName ?? "Receipt uploaded"}
                          </span>
                        ) : (
                          <span className="badge badge-draft">⏳ Processing...</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-row">
                          <button className="btn btn-sm btn-ghost" onClick={() => setReplaceTarget({ id, kind: "own" })}>
                            Replace Receipt
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget({ id, kind: "own" })}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Registration"
          message="This action permanently removes the registration and its receipt from Google Drive, allowing the student's registration number to be re-used. This cannot be undone."
          confirmLabel="Delete Permanently"
          danger={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await api.deleteRegistration({ registrationId: deleteTarget.id, kind: deleteTarget.kind });
              toast.success("Registration deleted.");
              await reload();
            } catch (err) {
              toast.error(friendlyError(err));
            }
          }}
        />
      )}

      {replaceTarget && (
        <Modal title="Replace Receipt PDF" onClose={() => setReplaceTarget(null)}>
          <p className="field-hint" style={{ marginTop: 0, marginBottom: 14 }}>
            Upload a replacement payment receipt PDF file (maximum file size: 1 MB).
          </p>
          <label htmlFor="replaceFile">New PDF File</label>
          <input
            id="replaceFile"
            type="file"
            accept="application/pdf"
            onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
          />
          <div className="modal-actions">
            <button className="btn" onClick={() => setReplaceTarget(null)} disabled={replaceBusy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleReplace} disabled={replaceBusy || !replaceFile}>
              {replaceBusy ? "Uploading..." : "Replace Receipt"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
