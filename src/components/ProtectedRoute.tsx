import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, isAdmin, loading, signOut } = useAuth();

  if (loading) return <div className="loading-state">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="login-shell">
        <div className="card login-card">
          <h2>Not authorized</h2>
          <p className="page-subtitle">
            This account doesn't have administrator access. If you believe this is a mistake, contact another admin.
          </p>
          <button className="btn" style={{ width: "100%" }} onClick={() => signOut()}>
            Log out
          </button>
        </div>
      </div>
    );
  }
  return children;
}
