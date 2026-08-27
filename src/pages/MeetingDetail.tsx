import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Meeting } from "../types";
import AttendanceMarker from "../components/AttendanceMarker";

export default function MeetingDetail() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;
    getDoc(doc(db, "meetings", meetingId))
      .then((snap) => setMeeting(snap.exists() ? (snap.data() as Meeting) : null))
      .finally(() => setLoading(false));
  }, [meetingId]);

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ width: "60%", marginBottom: 12 }} />
        <div className="skeleton" style={{ width: "40%" }} />
      </div>
    );
  }

  if (!meeting || !meetingId) {
    return <div className="card error-state">Meeting not found.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/meetings" className="btn btn-sm btn-ghost" style={{ display: "inline-flex", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Meetings</span>
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: 6 }}>{meeting.title}</h1>
            {meeting.description && (
              <p style={{ color: "var(--text-secondary)", margin: "0 0 12px", fontSize: "0.95rem" }}>
                {meeting.description}
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
                <span>{meeting.date} ({meeting.startTime} – {meeting.endTime})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{meeting.location}</span>
              </div>
            </div>
          </div>
          <span className={`badge badge-${meeting.status}`} style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
            {meeting.status}
          </span>
        </div>
      </div>

      <AttendanceMarker scope="meeting" scopeId={meetingId} />
    </div>
  );
}
