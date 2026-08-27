import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import toast from "react-hot-toast";
import { auth, db } from "../firebase";
import { Administrator, Member } from "../types";
import { api, friendlyError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";

export default function Administrators() {
  const { user } = useAuth();
  const [pureAdmins, setPureAdmins] = useState<Administrator[]>([]);
  const [memberAdmins, setMemberAdmins] = useState<Member[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Administrator | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub1 = onSnapshot(query(collection(db, "admins"), orderBy("name")), (snap) => {
      setPureAdmins(snap.docs.map((d) => d.data() as Administrator));
    });
    const unsub2 = onSnapshot(query(collection(db, "members"), where("role", "==", "admin")), (snap) => {
      setMemberAdmins(snap.docs.map((d) => d.data() as Member));
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  async function handleResend(email: string, adminId: string) {
    setResendingId(adminId);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`Setup email re-sent to ${email}.`);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setResendingId(null);
    }
  }

  const totalAdmins = pureAdmins.length + memberAdmins.length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1>Administrators</h1>
            <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
              {totalAdmins} total administrator{totalAdmins === 1 ? "" : "s"} with portal management privileges.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Administrator</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2>Dedicated Administrators ({pureAdmins.length})</h2>
          <span className="badge badge-admin">Faculty & Advisors</span>
        </div>
        <p className="page-subtitle">
          Faculty advisors or staff with administrative privileges. They do not have student registration numbers and do not appear in member rosters.
        </p>

        {pureAdmins.length === 0 ? (
          <p className="empty-state">No dedicated administrators registered.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Administrator Name</th>
                  <th>Email Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pureAdmins.map((a) => (
                  <tr key={a.adminId}>
                    <td>
                      <strong style={{ color: "var(--text-primary)" }}>{a.name}</strong>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{a.email}</td>
                    <td>
                      <div className="btn-row">
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={resendingId === a.adminId}
                          onClick={() => handleResend(a.email, a.adminId)}
                        >
                          {resendingId === a.adminId ? "Sending..." : "Resend Setup"}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={a.adminId === user?.uid}
                          onClick={() => setRevokeTarget(a)}
                        >
                          Revoke Access
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2>FFCS Members with Admin Access ({memberAdmins.length})</h2>
          <span className="badge badge-ffcs">FFCS Core Admins</span>
        </div>
        <p className="page-subtitle">
          Club members with administrative access. To change their role or deactivate them, manage their profile in the FFCS Members tab.
        </p>

        {memberAdmins.length === 0 ? (
          <p className="empty-state">No FFCS members currently assigned admin role.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Reg. Number</th>
                  <th>College Email</th>
                  <th>Role Tag</th>
                </tr>
              </thead>
              <tbody>
                {memberAdmins.map((m) => (
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
                      <span className="badge badge-admin">FFCS Admin</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddAdministratorModal onClose={() => setShowAdd(false)} />}

      {revokeTarget && (
        <ConfirmModal
          title="Revoke Administrator Access"
          message={`Are you sure you want to disable ${revokeTarget.name}'s administrator account (${revokeTarget.email})? They will no longer be able to sign in.`}
          confirmLabel="Revoke Access"
          danger={true}
          onClose={() => setRevokeTarget(null)}
          onConfirm={async () => {
            try {
              await api.revokeAdministrator({ adminId: revokeTarget.adminId });
              toast.success("Administrator access revoked.");
            } catch (err) {
              toast.error(friendlyError(err));
            }
          }}
        />
      )}
    </div>
  );
}

function AddAdministratorModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await api.createAdministrator({ name, email });
      await sendPasswordResetEmail(auth, res.data.email);
      toast.success(`${name} added — setup email sent to ${res.data.email}.`);
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Dedicated Administrator" onClose={onClose}>
      <p className="field-hint" style={{ marginTop: 0, marginBottom: 14 }}>
        For faculty advisors or staff who require admin privileges but are not student FFCS club members.
      </p>
      <label htmlFor="adminName">Full Name</label>
      <input id="adminName" placeholder="e.g. Dr. K. Sharma" value={name} onChange={(e) => setName(e.target.value)} />

      <label htmlFor="adminEmail">Email Address</label>
      <input id="adminEmail" type="email" placeholder="faculty@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />

      <p className="field-hint">A password setup email will be automatically sent to this address.</p>

      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !name.trim() || !email.trim()}>
          {submitting ? "Adding..." : "Add Administrator"}
        </button>
      </div>
    </Modal>
  );
}
