import { useState, FormEvent } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../lib/api";

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      toast.error(friendlyError(err) === "Something went wrong. Please try again." ? "Invalid email or password." : friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email above first, then click 'Forgot password?'.");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      toast.success("If that email has an account, a reset link has been sent.");
    } catch {
      toast.success("If that email has an account, a reset link has been sent.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand-container">
          <img src="/logo.png" alt="Swarajya" className="login-logo" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          <h1 className="gate-brand-title">स्वराज्य</h1>
          <p className="gate-brand-subtitle">FFCS Member Management Portal</p>
          <div style={{ display: "inline-flex", marginTop: 10 }}>
            <span className="live-indicator-container" style={{ fontSize: "0.72rem" }}>
              <span className="live-dot" />
              <span>Admin Access Gate</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Administrator Email</label>
          <div className="search-wrapper" style={{ maxWidth: "100%" }}>
            <span className="search-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="search-wrapper" style={{ maxWidth: "100%" }}>
            <span className="search-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 22, padding: "12px 20px", fontSize: "0.95rem" }}
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Enter Portal →"}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleForgotPassword} disabled={resetting}>
            {resetting ? "Sending reset link..." : "Forgot password?"}
          </button>
        </div>
      </div>
    </div>
  );
}
