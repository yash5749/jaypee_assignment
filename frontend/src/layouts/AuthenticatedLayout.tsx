import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { StudyRoomDto } from "../../../shared/types";
import { useAuth } from "../hooks/useAuth";

interface AuthenticatedLayoutProps {
  children: ReactNode;
  room?: StudyRoomDto | null;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition",
    isActive
      ? "border-[color:var(--border-strong)] bg-white text-[color:var(--text)] shadow-[var(--shadow-sm)]"
      : "border-transparent text-[color:var(--text-muted)] hover:border-[color:var(--border)] hover:bg-white/70",
  ].join(" ");

const AuthenticatedLayout = ({ children, room }: AuthenticatedLayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <div className="app-frame flex flex-1 flex-col gap-6 lg:gap-8">
        <div className="grid flex-1 gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <div className="surface-card p-5">
              <p className="section-eyebrow">Signed in</p>
              <p className="mt-4 text-base font-semibold text-[color:var(--text)]">
                {user?.name ?? "Student"}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                {user?.email ?? "No email"}
              </p>
            </div>

            <nav className="surface-card p-4">
              <p className="section-eyebrow">Navigation</p>
              <div className="mt-4 flex flex-col gap-3">
                <NavLink to="/" className={navLinkClass} end>
                  Dashboard
                </NavLink>
                <NavLink to="/profile" className={navLinkClass}>
                  Profile
                </NavLink>
              </div>
            </nav>

            {room && (
              <div className="surface-card p-5">
                <p className="section-eyebrow">Current room</p>
                <p className="mt-4 text-sm font-semibold text-[color:var(--text)]">
                  {room.name}
                </p>
                <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.28em] text-[color:var(--text-soft)]">
                  {room.code}
                </p>
              </div>
            )}
          </aside>

          <main className="min-w-0 flex flex-col gap-6 lg:gap-8">
            {children}
          </main>
        </div>

        <footer className="mt-2 flex flex-col gap-2 text-sm text-[color:var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://github.com/yash5749"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[color:var(--text)] hover:underline"
          >
            GitHub
          </a>
          <span>Made with ❤️ by Yash</span>
          <span className="text-xs uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
            Collaborative Study Room Platform
          </span>
        </footer>
      </div>
    </div>
  );
};

export default AuthenticatedLayout;
