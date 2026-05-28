import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SessionAnalyticsDto, StudyRoomDto } from "../../../shared/types";
import { useAuth } from "../hooks/useAuth";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  listRooms,
} from "../services/rooms";
import { getDashboardAnalytics } from "../services/sessions";
import { getErrorMessage } from "../utils/apiError";
import { formatDuration, formatDurationLabel } from "../utils/formatters";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState<StudyRoomDto[]>([]);
  const [analytics, setAnalytics] = useState<SessionAnalyticsDto | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Promise.all([listRooms(), getDashboardAnalytics()])
      .then(([roomData, analyticsData]) => {
        setRooms(roomData);
        setAnalytics(analyticsData);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => {
        setLoadingRooms(false);
        setLoadingAnalytics(false);
      });
  }, []);

  const refreshAnalytics = async () => {
    const data = await getDashboardAnalytics();
    setAnalytics(data);
  };

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setActionLoading(true);

    try {
      const room = await createRoom(roomName);
      setRooms((prev) => [room, ...prev]);
      setRoomName("");
      await refreshAnalytics();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setActionLoading(true);

    try {
      const room = await joinRoom(roomCode);
      setRooms((prev) => {
        if (prev.find((item) => item.id === room.id)) {
          return prev;
        }

        return [room, ...prev];
      });
      setRoomCode("");
      await refreshAnalytics();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    setError("");
    setActionLoading(true);

    try {
      await leaveRoom(roomId);
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      await refreshAnalytics();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const focusWindows = [
    {
      label: "24h",
      seconds: analytics?.dailyStudySeconds ?? 0,
      tone: "from-emerald-500 to-teal-600",
    },
    {
      label: "7d",
      seconds: analytics?.weeklyStudySeconds ?? 0,
      tone: "from-amber-500 to-orange-500",
    },
    {
      label: "30d",
      seconds: analytics?.monthlyStudySeconds ?? 0,
      tone: "from-sky-500 to-cyan-500",
    },
  ];

  const maxFocusWindowSeconds = Math.max(
    ...focusWindows.map((window) => window.seconds),
    1
  );
  const maxRoomHistorySeconds = Math.max(
    ...(analytics?.roomSummaries.map((summary) => summary.totalStudySeconds) ?? [0]),
    1
  );

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col gap-6 lg:gap-8">
        <section className="hero-panel animate-rise">
          <div className="panel-heading gap-5">
            <div className="max-w-3xl">
              <p className="section-eyebrow">Your study workspace</p>
              <h1 className="display-title mt-4">
                Welcome back, {user?.name}. Keep the momentum thoughtful and
                steady.
              </h1>
              <p className="section-copy mt-5 max-w-2xl">
                Create a focused room, join your group by code, and keep your
                study sessions visible enough to stay accountable without adding
                pressure.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="status-pill">
                {loadingRooms ? "Loading rooms" : `${rooms.length} joined rooms`}
              </span>
              <button onClick={logout} className="app-button-secondary">
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <article className="metric-card">
                <p className="section-eyebrow">Total study time</p>
                <p className="metric-value">
                  {formatDuration(analytics?.totalStudySeconds ?? 0)}
                </p>
                <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                  Preserved across every room you have studied in.
                </p>
              </article>

              <article className="metric-card">
                <p className="section-eyebrow">Past 24 hours</p>
                <p className="metric-value">
                  {formatDuration(analytics?.dailyStudySeconds ?? 0)}
                </p>
                <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                  Personal focus time recorded in the last day.
                </p>
              </article>

              <article className="metric-card">
                <p className="section-eyebrow">Past 7 days</p>
                <p className="metric-value">
                  {formatDuration(analytics?.weeklyStudySeconds ?? 0)}
                </p>
                <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                  Weekly momentum across your recent study blocks.
                </p>
              </article>

              <article className="metric-card">
                <p className="section-eyebrow">Past 30 days</p>
                <p className="metric-value">
                  {formatDuration(analytics?.monthlyStudySeconds ?? 0)}
                </p>
                <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                  Monthly history that remains even after leaving a room.
                </p>
              </article>

              <article className="metric-card">
                <p className="section-eyebrow">Live joined rooms</p>
                <p className="metric-value">{analytics?.activeSessions ?? 0}</p>
                <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                  Active sessions in rooms you currently belong to.
                </p>
              </article>
            </div>

            <div className="tinted-card p-5">
              <p className="section-eyebrow">What this space is for</p>
              <p className="mt-4 text-base font-semibold leading-7 text-[color:var(--text)]">
                A room should feel like a gentle commitment: clear, live, and
                easy to return to when you need momentum more than motivation.
              </p>
              <p className="section-copy mt-4">
                Rooms stay lightweight, sessions stay visible, and the activity
                dashboard helps you notice consistency instead of chasing noise.
              </p>
            </div>
          </div>
        </section>

        {error && <p className="app-alert-error animate-rise">{error}</p>}

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-card-strong animate-rise p-6 sm:p-7">
            <div className="panel-heading">
              <div>
                <p className="section-eyebrow">Create a room</p>
                <h2 className="section-title mt-3">Open a new focus environment</h2>
              </div>
              <span className="status-pill">Owner access included</span>
            </div>

            <p className="section-copy mt-4 max-w-xl">
              Start a space for your next study block, interview prep sprint, or
              revision session with a clear name your group can instantly
              recognize.
            </p>

            <form onSubmit={handleCreateRoom} className="mt-6 space-y-5">
              <label className="app-label">
                Room name
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  className="app-input"
                  placeholder="Operating systems revision room"
                  required
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[color:var(--text-muted)]">
                  Your room code is generated automatically and can be shared as
                  soon as the room is created.
                </p>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="app-button-primary sm:min-w-44"
                >
                  {actionLoading ? "Creating..." : "Create room"}
                </button>
              </div>
            </form>
          </div>

          <div className="surface-card animate-rise p-6 sm:p-7">
            <div className="panel-heading">
              <div>
                <p className="section-eyebrow">Join by code</p>
                <h2 className="section-title mt-3">Step into an existing room</h2>
              </div>
              <span className="status-pill">Fast entry</span>
            </div>

            <p className="section-copy mt-4">
              Paste the shared room code to rejoin your group, sync session
              state, and start collaborating right away.
            </p>

            <form onSubmit={handleJoinRoom} className="mt-6 space-y-5">
              <label className="app-label">
                Room code
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  className="app-input uppercase tracking-[0.3em]"
                  placeholder="ABCD12"
                  required
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[color:var(--text-muted)]">
                  Codes are room-specific and will instantly restore your room
                  membership if you already joined before.
                </p>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="app-button-secondary sm:min-w-44"
                >
                  {actionLoading ? "Joining..." : "Join room"}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="surface-card-strong animate-rise p-6 sm:p-7">
            <div className="panel-heading">
              <div>
                <p className="section-eyebrow">Study history by room</p>
                <h2 className="section-title mt-3">
                  Your personal effort stays visible over time
                </h2>
              </div>
              {loadingAnalytics && <span className="status-pill">Loading</span>}
            </div>

            <div className="mt-6 rounded-[24px] border border-[color:var(--border)] bg-white/55 p-5">
              <div className="flex items-end justify-between gap-4">
                {focusWindows.map((window) => {
                  const height = `${Math.max(
                    (window.seconds / maxFocusWindowSeconds) * 100,
                    window.seconds > 0 ? 24 : 10
                  )}%`;

                  return (
                    <div
                      key={window.label}
                      className="flex flex-1 flex-col items-center gap-3"
                    >
                      <div
                        className="flex h-40 w-full items-end justify-center rounded-[20px] px-3 py-3"
                        style={{ backgroundColor: "rgba(236, 228, 216, 0.7)" }}
                      >
                        <div
                          className={`w-full rounded-[16px] bg-gradient-to-t ${window.tone} shadow-[var(--shadow-sm)]`}
                          style={{ height }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[color:var(--text)]">
                          {formatDuration(window.seconds)}
                        </p>
                        <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[color:var(--text-soft)]">
                          {window.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">
                A quick graph of your personal study time over the last day,
                week, and month.
              </p>
            </div>

            {analytics?.roomSummaries.length ? (
              <ul className="mt-6 space-y-4">
                {analytics.roomSummaries.slice(0, 4).map((summary) => (
                  <li key={summary.roomId} className="list-card">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold text-[color:var(--text)]">
                          {summary.roomName}
                        </p>
                        <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.28em] text-[color:var(--text-soft)]">
                          {summary.roomCode}
                        </p>
                      </div>
                      <span className="status-pill">
                        {formatDuration(summary.totalStudySeconds)}
                      </span>
                    </div>
                    <div
                      className="mt-4 h-2.5 rounded-full"
                      style={{ backgroundColor: "rgba(236, 228, 216, 0.8)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(
                            (summary.totalStudySeconds / maxRoomHistorySeconds) * 100,
                            6
                          )}%`,
                          background:
                            "linear-gradient(90deg, var(--accent), #22c55e)",
                        }}
                      />
                    </div>
                    <p className="mt-4 text-sm text-[color:var(--text-muted)]">
                      You logged {summary.totalSessions} sessions and sent{" "}
                      {summary.totalMessages} messages in this room.
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-soft)]">
                      {formatDurationLabel(summary.totalStudySeconds)} total
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state mt-6">
                Your room history will appear once you begin chatting or
                running shared study sessions.
              </div>
            )}
          </div>

          <div className="surface-card animate-rise p-6 sm:p-7">
            <div className="panel-heading">
              <div>
                <p className="section-eyebrow">Your recent activity</p>
                <h2 className="section-title mt-3">
                  A rolling view of the work you have actually done
                </h2>
              </div>
            </div>

            {analytics?.recentActivity.length ? (
              <ul className="mt-6 space-y-4">
                {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                  <li
                    key={`${activity.type}-${activity.createdAt}-${index}`}
                    className="timeline-card"
                  >
                    <p className="text-sm leading-6 text-[color:var(--text)]">
                      <span className="font-bold">{activity.userName}</span>{" "}
                      {activity.type === "message" && "sent a message"}
                      {activity.type === "session-started" &&
                        "started a study session"}
                      {activity.type === "session-ended" &&
                        "ended a study session"}
                      {" in "}
                      <span className="font-bold">{activity.roomName}</span>.
                    </p>
                    {activity.content && (
                      <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                        "{activity.content}"
                      </p>
                    )}
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-soft)]">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state mt-6">
                Once you begin studying or messaging, this feed will help you
                track your own momentum at a glance.
              </div>
            )}
          </div>
        </section>

        <section className="surface-card-strong animate-rise p-6 sm:p-7">
          <div className="panel-heading">
            <div>
              <p className="section-eyebrow">Your rooms</p>
              <h2 className="section-title mt-3">
                Move between study spaces without losing context
              </h2>
            </div>
            {loadingRooms && <span className="status-pill">Loading</span>}
          </div>

          {!loadingRooms && rooms.length === 0 ? (
            <div className="empty-state mt-6">
              You have not joined any rooms yet. Create your first room or use a
              room code to step into a shared study session.
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 lg:grid-cols-2">
              {rooms.map((room) => (
                <li key={room.id} className="list-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="section-eyebrow">Room code</p>
                      <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.28em] text-[color:var(--text-soft)]">
                        {room.code}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLeaveRoom(room.id)}
                      disabled={actionLoading}
                      className="app-button-ghost px-3 py-2 text-xs"
                    >
                      Leave
                    </button>
                  </div>

                  <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[color:var(--text)]">
                    {room.name}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                    Open the room to manage live sessions, check presence, and
                    continue the conversation with your study group.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <span className="status-pill">Ready for focus</span>
                    <Link
                      to={`/rooms/${room.id}`}
                      className="app-button-primary px-4 py-2.5"
                    >
                      Enter room
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AuthenticatedLayout>
  );
};

export default DashboardPage;
