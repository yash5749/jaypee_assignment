import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../utils/apiError";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(name, email, password);
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
            <p className="section-eyebrow">Build your routine</p>
            <h1 className="display-title mt-5 max-w-lg">
              Start a study workspace that helps consistency feel natural.
            </h1>
            <p className="section-copy mt-5 max-w-xl">
              Create rooms, bring in your study partners, and turn scattered
              solo prep into focused sessions with a shared rhythm.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="metric-card">
              <p className="section-eyebrow">Why it works</p>
              <p className="mt-3 text-base font-semibold text-[color:var(--text)]">
                Clear rooms, visible presence, and live session timing create
                gentle accountability without adding noise.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="metric-card">
                <p className="section-eyebrow">Less friction</p>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  Create a room in seconds and share the code with your group.
                </p>
              </div>
              <div className="metric-card">
                <p className="section-eyebrow">More momentum</p>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  Keep every session visible, measurable, and easy to return to.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="mx-auto flex w-full justify-center lg:justify-end">
          <div className="auth-card animate-rise">
            <div className="panel-heading">
              <div>
                <p className="section-eyebrow">Create account</p>
                <h2 className="section-title mt-3">
                  Set up your collaborative focus space
                </h2>
              </div>
              <span className="status-pill">Less noise, more progress</span>
            </div>

            <p className="section-copy mt-4">
              Create your account to open rooms, track study sessions, and stay
              connected with the people you study with most.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="app-label">
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="app-input"
                  placeholder="Your name"
                  required
                />
              </label>

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
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </label>

              {error && <p className="app-alert-error">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="app-button-primary w-full"
              >
                {submitting ? "Creating account..." : "Create my workspace"}
              </button>
            </form>

            <div className="mt-8 rounded-[24px] border border-[color:var(--border)] bg-white/55 p-4 text-sm text-[color:var(--text-muted)]">
              Already have an account?{" "}
              <Link
                className="font-bold text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)]"
                to="/login"
              >
                Sign in here
              </Link>
              {" "}and return to your current rooms.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
