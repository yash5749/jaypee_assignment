import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SessionAnalyticsDto, StudyRoomDto } from "../../../shared/types";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../utils/apiError";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  listRooms,
} from "../services/rooms";
import { getDashboardAnalytics } from "../services/sessions";
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Dashboard
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Welcome, {user?.name}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Create or join a study room to get started.
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Study analytics
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  A quick view of your study activity across joined rooms.
                </p>
              </div>
              {loadingAnalytics && (
                <span className="text-sm text-slate-500">Loading...</span>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Total study time
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatDuration(analytics?.totalStudySeconds ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Sessions logged
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {analytics?.totalSessions ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Active rooms
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {analytics?.activeSessions ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Room summary
                </h3>
                {analytics?.roomSummaries.length ? (
                  <ul className="mt-3 space-y-3">
                    {analytics.roomSummaries.slice(0, 4).map((summary) => (
                      <li
                        key={summary.roomId}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {summary.roomName}
                            </p>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              {summary.roomCode}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-700">
                            {formatDuration(summary.totalStudySeconds)}
                          </p>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {summary.totalSessions} sessions · {summary.totalMessages} messages
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Analytics will appear once you start studying or chatting.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Recent activity
                </h3>
                {analytics?.recentActivity.length ? (
                  <ul className="mt-3 space-y-3">
                    {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                      <li
                        key={`${activity.type}-${activity.createdAt}-${index}`}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <p className="text-sm text-slate-800">
                          <span className="font-semibold">{activity.userName}</span>{" "}
                          {activity.type === "message" && "sent a message"}
                          {activity.type === "session-started" && "started a study session"}
                          {activity.type === "session-ended" && "ended a study session"}
                          {" in "}
                          <span className="font-semibold">{activity.roomName}</span>
                        </p>
                        {activity.content && (
                          <p className="mt-2 text-sm text-slate-500">
                            {activity.content}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Recent activity will appear here as rooms get used.
                  </p>
                )}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleCreateRoom}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Create a room
            </h2>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Room name
              <input
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="Focus Session"
                required
              />
            </label>
            <button
              type="submit"
              disabled={actionLoading}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {actionLoading ? "Working..." : "Create room"}
            </button>
          </form>

          <form
            onSubmit={handleJoinRoom}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Join by code
            </h2>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Room code
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase tracking-widest focus:border-slate-400 focus:outline-none"
                placeholder="ABCD12"
                required
              />
            </label>
            <button
              type="submit"
              disabled={actionLoading}
              className="mt-4 w-full rounded-lg border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {actionLoading ? "Working..." : "Join room"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Your rooms
            </h2>
            {loadingRooms && (
              <span className="text-sm text-slate-500">Loading...</span>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {!loadingRooms && rooms.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              You have not joined any rooms yet.
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    to={`/rooms/${room.id}`}
                    className="text-sm font-semibold text-slate-900 hover:underline"
                  >
                    {room.name}
                  </Link>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {room.code}
                  </p>
                </div>
                <button
                  onClick={() => handleLeaveRoom(room.id)}
                  disabled={actionLoading}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Leave
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
