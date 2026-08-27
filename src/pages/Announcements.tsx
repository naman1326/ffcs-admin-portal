import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../firebase";
import { api, friendlyError } from "../lib/api";
import ConfirmModal from "../components/ConfirmModal";

interface Announcement {
  announcementId: string;
  title: string;
  body: string;
  createdAt?: { toDate: () => Date };
}

export default function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "announcements"), orderBy("createdAt", "desc")), (snap) => {
      setItems(snap.docs.map((d) => d.data() as Announcement));
    });
    return unsub;
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    try {
      await api.createAnnouncement({ title, body });
      toast.success("Announcement broadcasted to members.");
      setTitle("");
      setBody("");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1>Announcements</h1>
            <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
              Broadcast real-time announcements to all registered FFCS members.
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ padding: "6px", borderRadius: 8, background: "rgba(255, 107, 53, 0.15)", color: "var(--brand-saffron)", display: "flex" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          </div>
          <h2 style={{ margin: 0 }}>Post New Announcement</h2>
        </div>

        <label htmlFor="title">Announcement Title</label>
        <input
          id="title"
          placeholder="e.g. Mandatory FFCS Briefing Meeting This Friday"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label htmlFor="body">Announcement Content</label>
        <textarea
          id="body"
          rows={4}
          placeholder="Write the full message to be displayed on member dashboards..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            disabled={submitting || !title.trim() || !body.trim()}
            onClick={handleCreate}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>{submitting ? "Broadcasting..." : "Broadcast Announcement"}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2>Live Announcements ({items.length})</h2>
          <span className="badge badge-present">Active Feed</span>
        </div>

        {items.length === 0 ? (
          <p className="empty-state">No announcements currently published.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map((a) => (
              <div
                key={a.announcementId}
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius)",
                  background: "rgba(21, 17, 15, 0.6)",
                  border: "1px solid rgba(255, 107, 53, 0.15)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)" }}>{a.title}</strong>
                    {a.createdAt?.toDate && (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {a.createdAt.toDate().toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {a.body}
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  style={{ flexShrink: 0 }}
                  onClick={() => setDeleteTarget(a)}
                  title="Delete announcement"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Announcement"
          message={`Are you sure you want to delete "${deleteTarget.title}"? It will no longer appear on member dashboards.`}
          confirmLabel="Delete"
          danger={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await api.deleteAnnouncement({ announcementId: deleteTarget.announcementId });
              toast.success("Announcement deleted.");
            } catch (err) {
              toast.error(friendlyError(err));
            }
          }}
        />
      )}
    </div>
  );
}
