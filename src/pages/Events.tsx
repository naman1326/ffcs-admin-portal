import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { ClubEvent } from "../types";
import { api, friendlyError } from "../lib/api";
import Modal from "../components/Modal";

export default function Events() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ClubEvent | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "events"), orderBy("date", "desc")), (snap) => {
      setEvents(snap.docs.map((d) => d.data() as ClubEvent));
    });
    return unsub;
  }, []);

  async function handleStatusAction(event: ClubEvent, action: "publish" | "unpublish" | "cancel") {
    try {
      if (action === "publish") await api.publishEvent({ eventId: event.eventId });
      if (action === "unpublish") await api.unpublishEvent({ eventId: event.eventId });
      if (action === "cancel") await api.cancelEvent({ eventId: event.eventId });
      toast.success(`Event ${action}ed successfully.`);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1>Club Events</h1>
            <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
              Publish events, manage schedules, and record member attendance.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create Event</span>
          </button>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Date</th>
              <th>Time Window</th>
              <th>Venue</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.eventId}>
                <td>
                  <Link to={`/events/${ev.eventId}`} style={{ fontWeight: 600 }}>
                    {ev.title}
                  </Link>
                  {ev.description && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.description}
                    </p>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{ev.date}</td>
                <td style={{ fontSize: "0.84rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  ⏰ {ev.startTime} – {ev.endTime}
                </td>
                <td>{ev.venue}</td>
                <td>
                  <span className={`badge badge-${ev.status}`}>{ev.status}</span>
                </td>
                <td>
                  <div className="btn-row">
                    <Link className="btn btn-sm btn-primary" to={`/events/${ev.eventId}`}>
                      Manage
                    </Link>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditTarget(ev)}>
                      Edit
                    </button>
                    {ev.status === "draft" && (
                      <button className="btn btn-sm" onClick={() => handleStatusAction(ev, "publish")}>
                        Publish
                      </button>
                    )}
                    {ev.status === "published" && (
                      <>
                        <button className="btn btn-sm" onClick={() => handleStatusAction(ev, "unpublish")}>
                          Unpublish
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleStatusAction(ev, "cancel")}>
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <p className="empty-state">No events found. Click "+ Create Event" to schedule an event.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <EventFormModal onClose={() => setShowCreate(false)} />}
      {editTarget && <EventFormModal event={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  );
}

function EventFormModal({ event, onClose }: { event?: ClubEvent; onClose: () => void }) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [date, setDate] = useState(event?.date ?? "");
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (event) {
        await api.updateEvent({
          eventId: event.eventId,
          updates: { title, description, date, startTime, endTime, venue },
        });
        toast.success("Event updated successfully.");
      } else {
        await api.createEvent({ title, description, date, startTime, endTime, venue });
        toast.success("Event created as draft. Publish it when ready.");
      }
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const valid = title.trim() && date && startTime && endTime && venue.trim();

  return (
    <Modal title={event ? "Edit Event Details" : "Create New Event"} onClose={onClose}>
      <label htmlFor="title">Event Title</label>
      <input id="title" placeholder="e.g. Swarajya Cultural Fest 2026" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label htmlFor="desc">Event Description</label>
      <textarea id="desc" rows={3} placeholder="Event overview, details, instructions..." value={description} onChange={(e) => setDescription(e.target.value)} />

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

      <label htmlFor="venue">Venue</label>
      <input id="venue" placeholder="e.g. Anna Auditorium" value={venue} onChange={(e) => setVenue(e.target.value)} />

      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !valid}>
          {submitting ? "Saving..." : event ? "Save Changes" : "Create Draft Event"}
        </button>
      </div>
    </Modal>
  );
}
