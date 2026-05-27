import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-frame flex min-h-[70vh] items-center justify-center">
          <div className="surface-card-strong animate-rise px-8 py-6 text-center">
            <p className="section-eyebrow">Preparing your workspace</p>
            <p className="mt-3 text-sm text-[color:var(--text-muted)]">
              Loading your rooms and study state...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
