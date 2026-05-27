import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../utils/apiError";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="auth-grid">
        <aside className="auth-side animate-rise">
          <div>
            <p className="section-eyebrow">Collaborative study room</p>
            <h1 className="display-title mt-5 max-w-lg">
              Return to a workspace built for calm, accountable focus.
            </h1>
            <p className="section-copy mt-5 max-w-xl">
              Pick up your rooms, reconnect with your study group, and step back
              into live sessions without losing your rhythm.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="metric-card">
              <p className="section-eyebrow">Focused collaboration</p>
              <p className="mt-3 text-base font-semibold text-[color:var(--text)]">
                Live room presence, shared sessions, and lightweight chat keep
                everyone aligned without turning the room into a distraction.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="metric-card">
                <p className="section-eyebrow">Session rhythm</p>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  Timers stay server-synced so every study block feels reliable.
                </p>
              </div>
              <div className="metric-card">
                <p className="section-eyebrow">Progress clarity</p>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  Dashboards and room history make momentum visible at a glance.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="mx-auto flex w-full justify-center lg:justify-end">
          <div className="auth-card animate-rise">
            <div className="panel-heading">
              <div>
                <p className="section-eyebrow">Welcome back</p>
                <h2 className="section-title mt-3">Sign in to your focus space</h2>
              </div>
              <span className="status-pill">Ready to study</span>
            </div>

            <p className="section-copy mt-4">
              Continue into your rooms, resume shared sessions, and stay in step
              with the people you learn best with.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="app-label">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="app-input"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="app-label">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="app-input"
                  placeholder="Enter your password"
                  required
                />
              </label>

              {error && <p className="app-alert-error">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="app-button-primary w-full"
              >
                {submitting ? "Signing in..." : "Enter study room"}
              </button>
            </form>

            <div className="mt-8 rounded-[24px] border border-[color:var(--border)] bg-white/55 p-4 text-sm text-[color:var(--text-muted)]">
              New here?{" "}
              <Link
                className="font-bold text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)]"
                to="/register"
              >
                Create your account
              </Link>
              {" "}and set up your first collaborative room.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
