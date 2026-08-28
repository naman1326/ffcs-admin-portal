import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../firebase";

interface Stats {
  totalMembers: number;
  upcomingMeetings: number;
  upcomingEvents: number;
  attendancePct: number | null;
  totalRegistrations: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [
        membersCount,
        meetingsCount,
        eventsCount,
        presentMeetingCount,
        totalMeetingAttCount,
        presentEventCount,
        totalEventAttCount,
        externalCount,
        ownCount,
      ] = await Promise.all([
        getCountFromServer(query(collection(db, "members"), where("isActive", "==", true))),
        getCountFromServer(query(collection(db, "meetings"), where("status", "==", "scheduled"), where("date", ">=", todayStr))),
        getCountFromServer(query(collection(db, "events"), where("status", "==", "published"), where("date", ">=", todayStr))),
        getCountFromServer(query(collection(db, "meetingAttendance"), where("status", "==", "Present"))),
        getCountFromServer(collection(db, "meetingAttendance")),
        getCountFromServer(query(collection(db, "eventAttendance"), where("status", "==", "Present"))),
        getCountFromServer(collection(db, "eventAttendance")),
        getCountFromServer(collection(db, "eventRegistrations")),
        getCountFromServer(collection(db, "ownEventRegistrations")),
      ]);

      const totalMarked = totalMeetingAttCount.data().count + totalEventAttCount.data().count;
      const totalPresent = presentMeetingCount.data().count + presentEventCount.data().count;
      setStats({
        totalMembers: membersCount.data().count,
        upcomingMeetings: meetingsCount.data().count,
        upcomingEvents: eventsCount.data().count,
        attendancePct: totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : null,
        totalRegistrations: externalCount.data().count + ownCount.data().count,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
              Real-time overview of Swarajya Club & FFCS Member Management.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="live-indicator-container">
              <span className="live-dot" />
              <span>Real-Time Sync</span>
            </div>
            <button className="btn btn-sm" onClick={loadStats} title="Refresh statistics">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card-grid">
        <div className="stat-card stat-accent-red">
          <div className="stat-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-value">{loading ? "..." : stats?.totalMembers ?? "—"}</div>
          <div className="stat-label">Active FFCS Members</div>
        </div>

        <div className="stat-card stat-accent-gradient">
          <div className="stat-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="stat-value">{loading ? "..." : stats?.upcomingMeetings ?? "—"}</div>
          <div className="stat-label">Upcoming Meetings</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <div className="stat-value">{loading ? "..." : stats?.upcomingEvents ?? "—"}</div>
          <div className="stat-label">Published Events</div>
        </div>

        <div className="stat-card stat-accent-green">
          <div className="stat-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-value">
            {loading ? "..." : stats?.attendancePct !== null && stats?.attendancePct !== undefined ? `${stats.attendancePct}%` : "—"}
          </div>
          <div className="stat-label">Average Attendance</div>
        </div>

        <div className="stat-card stat-accent-red">
          <div className="stat-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="stat-value">{loading ? "..." : stats?.totalRegistrations ?? "—"}</div>
          <div className="stat-label">Total Registrations</div>
        </div>
      </div>

      <div className="card">
        <h2>Quick Management Actions</h2>
        <p className="page-subtitle">Frequently accessed administrative operations.</p>
        <div className="btn-row">
          <Link className="btn btn-primary" to="/members">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>Manage FFCS Members</span>
          </Link>
          <Link className="btn btn-primary" to="/meetings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Meetings & Attendance</span>
          </Link>
          <Link className="btn" to="/events">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Manage Events</span>
          </Link>
          <Link className="btn" to="/announcements">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
            <span>Post Announcement</span>
          </Link>
          <Link className="btn" to="/audit-logs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Audit Trail</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
