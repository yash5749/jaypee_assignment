import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type {
  MessageDto,
  RoomMemberDto,
  StudyRoomDto,
  StudySessionDto,
} from "../../../shared/types";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../shared/socketEvents";
import { listRoomMessages } from "../services/messages";
import { getRoomDetails } from "../services/rooms";
import { getRoomSessionSync, listRoomSessions } from "../services/sessions";
import { getSocket } from "../sockets/socket";
import { getErrorMessage } from "../utils/apiError";
import { formatDuration } from "../utils/formatters";

const SESSION_OPTIONS = [
  { label: "25 min", value: 25 * 60 },
  { label: "45 min", value: 45 * 60 },
  { label: "60 min", value: 60 * 60 },
];

const RoomPage = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState<StudyRoomDto | null>(null);
  const [members, setMembers] = useState<RoomMemberDto[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [sessionHistory, setSessionHistory] = useState<StudySessionDto[]>([]);
  const [activeSession, setActiveSession] = useState<StudySessionDto | null>(null);
  const [messageText, setMessageText] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(25 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roomId) {
      return;
    }

    setLoading(true);
    Promise.all([
      getRoomDetails(roomId),
      listRoomMessages(roomId),
      listRoomSessions(roomId),
      getRoomSessionSync(roomId),
    ])
      .then(([roomDetails, roomMessages, roomSessions, syncedSession]) => {
        setRoom(roomDetails.room);
        setMembers(roomDetails.members);
        setMessages(roomMessages);
        setSessionHistory(roomSessions);
        setActiveSession(syncedSession);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!activeSession?.duration) {
      setSecondsRemaining(0);
      return;
    }

    const interval = window.setInterval(() => {
      const startedAt = new Date(activeSession.startedAt).getTime();
      const endAt = startedAt + activeSession.duration! * 1000;
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    }, 1000);

    const startedAt = new Date(activeSession.startedAt).getTime();
    const endAt = startedAt + activeSession.duration * 1000;
    setSecondsRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));

    return () => {
      window.clearInterval(interval);
    };
  }, [activeSession]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    const emitRoomSync = () => {
      socket.emit(ClientToServerEvents.JoinRoom, { roomId });
      socket.emit(ClientToServerEvents.RequestSync, { roomId });
    };

    const handleMembers = (payload: { roomId: string; members: string[] }) => {
      if (payload.roomId === roomId) {
        setOnlineMembers(payload.members);
      }
    };

    const handleMessage = (payload: { message: MessageDto }) => {
      if (payload.message.roomId === roomId) {
        setMessages((prev) => [...prev, payload.message]);
      }
    };

    const handleSessionStarted = (payload: { session: StudySessionDto }) => {
      if (payload.session.roomId !== roomId) {
        return;
      }

      setSessionLoading(false);
      setActiveSession(payload.session);
      setSessionHistory((prev) => {
        const next = prev.filter((session) => session.id !== payload.session.id);
        return [payload.session, ...next];
      });
    };

    const handleSessionEnded = (payload: { session: StudySessionDto }) => {
      if (payload.session.roomId !== roomId) {
        return;
      }

      setSessionLoading(false);
      setActiveSession(null);
      setSessionHistory((prev) => {
        const next = prev.filter((session) => session.id !== payload.session.id);
        return [payload.session, ...next];
      });
    };

    const handleSessionSync = (payload: {
      roomId: string;
      session: StudySessionDto | null;
    }) => {
      if (payload.roomId === roomId) {
        setSessionLoading(false);
        setActiveSession(payload.session);
      }
    };

    const handleSocketError = (payload: { message: string }) => {
      setError(payload.message);
      setSessionLoading(false);
    };

    emitRoomSync();
    socket.on("connect", emitRoomSync);
    socket.on(ServerToClientEvents.RoomMembersUpdated, handleMembers);
    socket.on(ServerToClientEvents.ReceiveMessage, handleMessage);
    socket.on(ServerToClientEvents.SessionStarted, handleSessionStarted);
    socket.on(ServerToClientEvents.SessionEnded, handleSessionEnded);
    socket.on(ServerToClientEvents.SessionSync, handleSessionSync);
    socket.on(ServerToClientEvents.Error, handleSocketError);

    return () => {
      socket.emit(ClientToServerEvents.LeaveRoom, { roomId });
      socket.off("connect", emitRoomSync);
      socket.off(ServerToClientEvents.RoomMembersUpdated, handleMembers);
      socket.off(ServerToClientEvents.ReceiveMessage, handleMessage);
      socket.off(ServerToClientEvents.SessionStarted, handleSessionStarted);
      socket.off(ServerToClientEvents.SessionEnded, handleSessionEnded);
      socket.off(ServerToClientEvents.SessionSync, handleSessionSync);
      socket.off(ServerToClientEvents.Error, handleSocketError);
    };
  }, [roomId]);

  const onlineList = useMemo(() => {
    const ids = new Set(onlineMembers);
    return members.filter((member) => ids.has(member.userId));
  }, [members, onlineMembers]);

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomId || !messageText.trim()) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      setError("Socket connection is not ready.");
      return;
    }

    setError("");
    socket.emit(ClientToServerEvents.SendMessage, {
      roomId,
      content: messageText.trim(),
    });
    setMessageText("");
  };

  const handleStartSession = () => {
    if (!roomId) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      setError("Socket connection is not ready.");
      return;
    }

    setError("");
    setSessionLoading(true);
    socket.emit(ClientToServerEvents.StartSession, {
      roomId,
      durationSeconds: selectedDuration,
    });
  };

  const handleStopSession = () => {
    if (!roomId) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      setError("Socket connection is not ready.");
      return;
    }

    setError("");
    setSessionLoading(true);
    socket.emit(ClientToServerEvents.StopSession, { roomId });
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm text-slate-600">Room not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <Link className="text-sm font-semibold text-slate-600" to="/">
          ← Back to dashboard
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Study room
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {room?.name ?? "Loading..."}
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
            {room?.code ?? ""}
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading room...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Study timer
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      The session state is controlled by the server and synced to everyone in the room.
                    </p>
                  </div>
                  {activeSession ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Idle
                    </span>
                  )}
                </div>

                {activeSession ? (
                  <div className="mt-6 rounded-2xl bg-slate-950 p-6 text-white">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Time remaining
                    </p>
                    <p className="mt-3 text-4xl font-semibold">
                      {formatDuration(secondsRemaining)}
                    </p>
                    <p className="mt-3 text-sm text-slate-300">
                      Started at {new Date(activeSession.startedAt).toLocaleTimeString()}
                    </p>
                    <button
                      type="button"
                      onClick={handleStopSession}
                      disabled={sessionLoading}
                      className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {sessionLoading ? "Stopping..." : "Stop session"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="flex flex-wrap gap-3">
                      {SESSION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedDuration(option.value)}
                          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                            selectedDuration === option.value
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 text-slate-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleStartSession}
                      disabled={sessionLoading}
                      className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {sessionLoading ? "Starting..." : "Start session"}
                    </button>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Recent sessions
                  </h3>
                  {sessionHistory.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      No study sessions have been logged yet.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {sessionHistory.slice(0, 5).map((session) => (
                        <li
                          key={session.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {session.duration
                                  ? `${Math.round(session.duration / 60)} minute focus block`
                                  : "Study session"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(session.startedAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-slate-700">
                              {session.endedAt ? "Completed" : "Active"}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Chat</h2>
                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto text-sm text-slate-700">
                  {messages.length === 0 ? (
                    <p className="text-slate-500">No messages yet.</p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500">
                          {message.user?.name ?? message.userId}
                        </p>
                        <p className="mt-1 text-slate-800">{message.content}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    placeholder="Type a message..."
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Online members
                </h2>
                {onlineList.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No one is online yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {onlineList.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span>{member.user?.name ?? member.userId}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                          Online
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  All members
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {members.map((member) => (
                    <li
                      key={member.id}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    >
                      {member.user?.name ?? member.userId}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
