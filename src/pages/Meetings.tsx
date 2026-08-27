import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { Meeting } from "../types";
import { api, friendlyError } from "../lib/api";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Meeting | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "meetings"), orderBy("date", "desc")), (snap) => {
      setMeetings(snap.docs.map((d) => d.data() as Meeting));
    });
    return unsub;
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1>Meetings & Attendance</h1>
            <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
              Schedule club meetings, take attendance for FFCS members, and view meeting rosters.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create Meeting</span>
          </button>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Meeting Title</th>
              <th>Date</th>
              <th>Time</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.meetingId}>
                <td>
                  <Link to={`/meetings/${m.meetingId}`} style={{ fontWeight: 600 }}>
                    {m.title}
                  </Link>
                  {m.description && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.description}
                    </p>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{m.date}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <code style={{ background: "rgba(255, 107, 53, 0.08)", padding: "2px 6px", borderRadius: 4, color: "var(--brand-saffron)" }}>
                    {m.startTime} – {m.endTime}
                  </code>
                </td>
                <td>{m.location}</td>
                <td>
                  <span className={`badge badge-${m.status}`}>{m.status}</span>
                </td>
                <td>
                  <div className="btn-row">
                    <Link className="btn btn-sm btn-primary" to={`/meetings/${m.meetingId}`}>
                      Attendance
                    </Link>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditTarget(m)}>
                      Edit
                    </button>
                    {m.status === "scheduled" && (
                      <button className="btn btn-sm" onClick={() => setCancelTarget(m)}>
                        Cancel
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(m)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {meetings.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <p className="empty-state">No meetings scheduled yet. Click "+ Create Meeting" to schedule one.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <MeetingFormModal onClose={() => setShowCreate(false)} />}
      {editTarget && <MeetingFormModal meeting={editTarget} onClose={() => setEditTarget(null)} />}

      {cancelTarget && (
        <ConfirmModal
          title="Cancel Meeting"
          message={`Are you sure you want to cancel "${cancelTarget.title}"? Members will see this meeting marked as cancelled.`}
          confirmLabel="Cancel Meeting"
          danger={true}
          onClose={() => setCancelTarget(null)}
          onConfirm={async () => {
            try {
              await api.cancelMeeting({ meetingId: cancelTarget.meetingId });
              toast.success("Meeting marked as cancelled.");
            } catch (err) {
              toast.error(friendlyError(err));
            }
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Meeting"
          message={`Permanently delete "${deleteTarget.title}" and all its attendance records? This action cannot be undone.`}
          confirmLabel="Delete Permanently"
          danger={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await api.deleteMeeting({ meetingId: deleteTarget.meetingId });
              toast.success("Meeting and attendance records deleted.");
            } catch (err) {
              toast.error(friendlyError(err));
            }
          }}
        />
      )}
    </div>
  );
}

function MeetingFormModal({ meeting, onClose }: { meeting?: Meeting; onClose: () => void }) {
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [description, setDescription] = useState(meeting?.description ?? "");
  const [date, setDate] = useState(meeting?.date ?? "");
  const [startTime, setStartTime] = useState(meeting?.startTime ?? "");
  const [endTime, setEndTime] = useState(meeting?.endTime ?? "");
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (meeting) {
        await api.updateMeeting({
          meetingId: meeting.meetingId,
          updates: { title, description, date, startTime, endTime, location },
        });
        toast.success("Meeting details updated.");
      } else {
        await api.createMeeting({ title, description, date, startTime, endTime, location });
        toast.success("Meeting scheduled successfully.");
      }
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const valid = title.trim() && date && startTime && endTime && location.trim();

  return (
    <Modal title={meeting ? "Edit Meeting Details" : "Create New Meeting"} onClose={onClose}>
      <label htmlFor="title">Meeting Title</label>
      <input id="title" placeholder="e.g. FFCS Weekly Sync & Planning" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label htmlFor="desc">Description / Agenda</label>
      <textarea
        id="desc"
        rows={3}
        placeholder="Agenda topics, discussion points..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label htmlFor="date">Date</label>
      <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="start">Start Time</label>
          <input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label htmlFor="end">End Time</label>
          <input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <label htmlFor="loc">Venue / Location</label>
      <input id="loc" placeholder="e.g. SJT 401 or Google Meet" value={location} onChange={(e) => setLocation(e.target.value)} />

      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !valid}>
          {submitting ? "Saving..." : meeting ? "Save Changes" : "Create Meeting"}
        </button>
      </div>
    </Modal>
  );
}
