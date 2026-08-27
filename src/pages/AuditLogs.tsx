import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "../firebase";
import { AuditLog } from "../types";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(200)))
      .then((snap) => setLogs(snap.docs.map((d) => d.data() as AuditLog)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.performedBy.toLowerCase().includes(q) ||
        (l.targetId && l.targetId.toLowerCase().includes(q))
    );
  }, [logs, filter]);

  function getActionBadgeClass(action: string) {
    const act = action.toLowerCase();
    if (act.includes("create") || act.includes("publish") || act.includes("add") || act.includes("activate")) {
      return "badge-present";
    }
    if (act.includes("delete") || act.includes("cancel") || act.includes("revoke") || act.includes("deactivate") || act.includes("undo")) {
      return "badge-absent";
    }
    return "badge-other";
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1>Audit Logs & History</h1>
            <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
              Immutable audit trail of administrative actions across FFCS members, meetings, and events (most recent 200).
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 16 }}>
          <div className="search-wrapper" style={{ maxWidth: 380 }}>
            <span className="search-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              placeholder="Filter by action, admin, or target ID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Showing {filtered.length} of {logs.length} logged actions
          </div>
        </div>

        {loading ? (
          <div>
            <div className="skeleton" style={{ width: "50%", marginBottom: 12 }} />
            <div className="skeleton" style={{ width: "100%", height: 160 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Type</th>
                  <th>Performed By</th>
                  <th>Target ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: "0.84rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : "—"}
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(l.action)}`}>
                        {l.action}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>
                        {l.performedBy}
                      </code>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.8rem", color: "var(--brand-saffron)" }}>
                        {l.targetId || "—"}
                      </code>
                    </td>
                    <td>
                      {(l.newValue || l.oldValue) ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setSelectedLog(selectedLog === l ? null : l)}
                        >
                          {selectedLog === l ? "Hide" : "View"}
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <p className="empty-state">No audit logs matching "{filter}".</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="card" style={{ animation: "slide-up 0.25s ease-out" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3>Payload Details — {selectedLog.action}</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelectedLog(null)}>
              ✕ Close
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: selectedLog.oldValue ? "1fr 1fr" : "1fr", gap: 16 }}>
            {selectedLog.oldValue !== undefined && selectedLog.oldValue !== null && (
              <div>
                <label>Previous State (Old Value)</label>
                <pre
                  style={{
                    background: "rgba(10, 8, 7, 0.8)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(226, 73, 58, 0.3)",
                    color: "#fca5a5",
                    fontSize: "0.8rem",
                    overflowX: "auto",
                  }}
                >
                  {JSON.stringify(selectedLog.oldValue, null, 2)}
                </pre>
              </div>
            )}
            {selectedLog.newValue !== undefined && selectedLog.newValue !== null && (
              <div>
                <label>Updated State (New Value)</label>
                <pre
                  style={{
                    background: "rgba(10, 8, 7, 0.8)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(31, 174, 95, 0.3)",
                    color: "#86efac",
                    fontSize: "0.8rem",
                    overflowX: "auto",
                  }}
                >
                  {JSON.stringify(selectedLog.newValue, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
