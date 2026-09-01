import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ClubEvent } from "../types";
import AttendanceMarker from "../components/AttendanceMarker";

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<ClubEvent | null>(null);
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
            </div>
          </div>
          <span className={`badge badge-${event.status}`} style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
            {event.status}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: "1.15rem", margin: 0 }}>FFCS Member Attendance</h2>
        <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
          Record attendance for club members attending this event.
        </p>
      </div>

      <AttendanceMarker scope="event" scopeId={eventId} />
    </div>
  );
}
