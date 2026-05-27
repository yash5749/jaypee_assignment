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
import { formatDuration } from "../utils/formatters";

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

  return (
    <div className="app-shell">
      <div className="app-frame flex flex-col gap-6 lg:gap-8">
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
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="metric-card">
                <p className="section-eyebrow">Total study time</p>
                <p className="metric-value">
                  {formatDuration(analytics?.totalStudySeconds ?? 0)}
                </p>
                <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                  Focus tracked across all joined rooms.
                </p>
              </article>

              <article className="metric-card">
                <p className="section-eyebrow">Sessions logged</p>
                <p className="metric-value">{analytics?.totalSessions ?? 0}</p>
                <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                  Shared blocks completed by your rooms so far.
                </p>
              </article>

              <article className="metric-card">
                <p className="section-eyebrow">Live rooms</p>
                <p className="metric-value">{analytics?.activeSessions ?? 0}</p>
                <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                  Rooms currently running an active study session.
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
                <p className="section-eyebrow">Room insights</p>
                <h2 className="section-title mt-3">How your spaces are being used</h2>
              </div>
              {loadingAnalytics && <span className="status-pill">Loading</span>}
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
                    <p className="mt-4 text-sm text-[color:var(--text-muted)]">
                      {summary.totalSessions} sessions tracked and{" "}
                      {summary.totalMessages} messages exchanged.
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state mt-6">
                Your room summaries will appear once you begin chatting or
                running shared study sessions.
              </div>
            )}
          </div>

          <div className="surface-card animate-rise p-6 sm:p-7">
            <div className="panel-heading">
              <div>
                <p className="section-eyebrow">Recent activity</p>
                <h2 className="section-title mt-3">A quick pulse on your groups</h2>
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
                Once a room becomes active, this feed will help you spot
                movement, momentum, and collaboration at a glance.
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
    </div>
  );
};

export default DashboardPage;
