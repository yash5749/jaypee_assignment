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
import { useAuth } from "../hooks/useAuth";
import { listRoomMessages } from "../services/messages";
import { getRoomDetails } from "../services/rooms";
import { getRoomSessionSync, listRoomSessions } from "../services/sessions";
import { getSocket } from "../sockets/socket";
import { getErrorMessage } from "../utils/apiError";
import { formatDuration, formatDurationLabel } from "../utils/formatters";

const SESSION_OPTIONS = [
  { label: "25 min", value: 25 * 60 },
  { label: "45 min", value: 45 * 60 },
  { label: "60 min", value: 60 * 60 },
];

const getSessionStatusCopy = (session: StudySessionDto) => {
  if (session.status === "active") {
    return {
      badgeClass: "status-pill-live",
      badgeLabel: "Active",
      detail: "Still running right now.",
    };
  }

  if (session.status === "completed") {
    return {
      badgeClass: "status-pill",
      badgeLabel: "Completed",
      detail: `Finished the full ${formatDurationLabel(
        session.trackedSeconds
      )} block.`,
    };
  }

  return {
    badgeClass: "status-pill",
    badgeLabel: "Left",
    detail: `Left after ${formatDurationLabel(session.trackedSeconds)}.`,
  };
};

const RoomPage = () => {
  const { user } = useAuth();
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

    const durationSeconds = activeSession.duration;
    const interval = window.setInterval(() => {
      const startedAt = new Date(activeSession.startedAt).getTime();
      const endAt = startedAt + durationSeconds * 1000;
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    }, 1000);

    const startedAt = new Date(activeSession.startedAt).getTime();
    const endAt = startedAt + durationSeconds * 1000;
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

  const onlineIds = useMemo(() => new Set(onlineMembers), [onlineMembers]);
  const onlineList = useMemo(() => {
    return members.filter((member) => onlineIds.has(member.userId));
  }, [members, onlineIds]);

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
      <div className="app-shell">
        <div className="app-frame">
          <div className="surface-card-strong p-8 text-center">
            <p className="section-eyebrow">Room unavailable</p>
            <p className="mt-4 text-sm text-[color:var(--text-muted)]">
              This room could not be found. Head back to the dashboard and choose
              another study space.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-frame flex flex-col gap-6 lg:gap-8">
        <section className="hero-panel animate-rise">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="app-button-ghost px-0 py-0 text-sm font-bold">
              Back to dashboard
            </Link>
            <div className="flex flex-wrap gap-3">
              <span className={activeSession ? "status-pill-live" : "status-pill"}>
                {activeSession ? "Live session in progress" : "Room idle"}
              </span>
              <span className="status-pill">
                {onlineList.length} online now
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="section-eyebrow">Study room</p>
              <h1 className="display-title mt-4">
                {room?.name ?? "Preparing room..."}
              </h1>
              <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.28em] text-[color:var(--text-soft)]">
                Room code {room?.code ?? ""}
              </p>
              <p className="section-copy mt-5 max-w-2xl">
                Use this space to hold a clear shared rhythm: start a timed
                session, keep the room active, and stay in lightweight
                conversation while you study.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="metric-card">
                <p className="section-eyebrow">Members</p>
                <p className="metric-value">{members.length}</p>
              </div>
              <div className="metric-card">
                <p className="section-eyebrow">Messages</p>
                <p className="metric-value">{messages.length}</p>
              </div>
              <div className="metric-card">
                <p className="section-eyebrow">Sessions tracked</p>
                <p className="metric-value">{sessionHistory.length}</p>
              </div>
            </div>
          </div>
        </section>

        {error && <p className="app-alert-error animate-rise">{error}</p>}

        {loading ? (
          <div className="surface-card-strong animate-rise p-8 text-center">
            <p className="section-eyebrow">Preparing room</p>
            <p className="mt-4 text-sm text-[color:var(--text-muted)]">
              Loading timer state, message history, and member presence...
            </p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <section className="surface-card-strong animate-rise p-6 sm:p-7">
                <div className="panel-heading">
                  <div>
                    <p className="section-eyebrow">Session control</p>
                    <h2 className="section-title mt-3">
                      Keep the timer at the center of the room
                    </h2>
                  </div>
                  <span className={activeSession ? "status-pill-live" : "status-pill"}>
                    {activeSession ? "Everyone is synced" : "Ready to begin"}
                  </span>
                </div>

                <p className="section-copy mt-4">
                  The backend remains the source of truth, while this view keeps
                  the countdown local, smooth, and readable for everyone in the
                  room.
                </p>

                {activeSession ? (
                  <div className="timer-stage animate-soft-pulse mt-6">
                    <p className="section-eyebrow text-white/60">Time remaining</p>
                    <p className="mt-4 text-5xl font-extrabold tracking-[-0.06em] sm:text-6xl">
                      {formatDuration(secondsRemaining)}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/74">
                      <span>Started at {new Date(activeSession.startedAt).toLocaleTimeString()}</span>
                      {activeSession.duration && (
                        <span>Duration {Math.round(activeSession.duration / 60)} min</span>
                      )}
                    </div>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleStopSession}
                        disabled={sessionLoading}
                        className="app-button rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#143531] hover:-translate-y-0.5 hover:bg-[#f4ede4] disabled:opacity-60"
                      >
                        {sessionLoading ? "Stopping..." : "Stop session"}
                      </button>
                      <span className="status-pill border-white/10 bg-white/10 text-white/80">
                        Live focus block
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="tinted-card mt-6 p-5 sm:p-6">
                    <p className="section-eyebrow">Choose a focus length</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {SESSION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedDuration(option.value)}
                          className={
                            selectedDuration === option.value
                              ? "choice-chip-active"
                              : "choice-chip"
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-[color:var(--text-muted)]">
                        Starting a session will notify everyone in the room and
                        sync the countdown using server timestamps.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartSession}
                        disabled={sessionLoading}
                        className="app-button-primary sm:min-w-44"
                      >
                        {sessionLoading ? "Starting..." : "Start session"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-7">
                  <div className="panel-heading">
                    <div>
                      <p className="section-eyebrow">Recent sessions</p>
                      <h3 className="section-title mt-3 text-xl">
                        A quick history of this room's rhythm
                      </h3>
                    </div>
                  </div>

                  {sessionHistory.length === 0 ? (
                    <div className="empty-state mt-5">
                      No study sessions have been logged yet. Start one when your
                      group is ready to focus together.
                    </div>
                  ) : (
                    <ul className="mt-5 space-y-4">
                      {sessionHistory.slice(0, 5).map((session) => {
                        const statusCopy = getSessionStatusCopy(session);

                        return (
                          <li key={session.id} className="timeline-card">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-bold text-[color:var(--text)]">
                                  {session.duration
                                    ? `${Math.round(session.duration / 60)} minute focus block`
                                    : "Study session"}
                                </p>
                                <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                                  {new Date(session.startedAt).toLocaleString()}
                                </p>
                                <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                                  {statusCopy.detail}
                                </p>
                              </div>
                              <span className={statusCopy.badgeClass}>
                                {statusCopy.badgeLabel}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>

              <section className="surface-card-strong animate-rise p-6 sm:p-7">
                <div className="panel-heading">
                  <div>
                    <p className="section-eyebrow">Room conversation</p>
                    <h2 className="section-title mt-3">
                      Keep the room aligned without breaking focus
                    </h2>
                  </div>
                  <span className="status-pill">
                    {messages.length} messages
                  </span>
                </div>

                <div className="mt-6 max-h-[32rem] space-y-4 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <div className="empty-state">
                      No messages yet. Use the room to share quick updates,
                      session cues, or short accountability check-ins.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isSelf = message.userId === user?.id;

                      return (
                        <div
                          key={message.id}
                          className={isSelf ? "message-bubble-self" : "message-bubble"}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-[color:var(--text)]">
                              {message.user?.name ?? message.userId}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-soft)]">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[color:var(--text)]">
                            {message.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="mt-6 rounded-[24px] border border-[color:var(--border)] bg-white/65 p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      className="app-input mt-0 flex-1 border-transparent bg-transparent px-3 py-3 shadow-none focus:border-[color:var(--accent)]"
                      placeholder="Share a quick update or cue for the room..."
                    />
                    <button type="submit" className="app-button-primary sm:min-w-32">
                      Send
                    </button>
                  </div>
                </form>
              </section>
            </div>

            <div className="space-y-6">
              <section className="surface-card-strong animate-rise p-6 sm:p-7">
                <div className="panel-heading">
                  <div>
                    <p className="section-eyebrow">Live presence</p>
                    <h2 className="section-title mt-3">Who is here right now</h2>
                  </div>
                  <span className="status-pill-live">{onlineList.length} online</span>
                </div>

                {onlineList.length === 0 ? (
                  <div className="empty-state mt-5">
                    No one is online yet. When members join the room, they will
                    appear here instantly.
                  </div>
                ) : (
                  <ul className="mt-5 space-y-3">
                    {onlineList.map((member) => (
                      <li key={member.id} className="presence-row">
                        <span className="font-semibold">
                          {member.user?.name ?? member.userId}
                        </span>
                        <span className="status-pill-live px-2.5 py-1 text-[10px]">
                          Online
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="surface-card animate-rise p-6 sm:p-7">
                <div className="panel-heading">
                  <div>
                    <p className="section-eyebrow">Room roster</p>
                    <h2 className="section-title mt-3">Everyone in this study group</h2>
                  </div>
                  <span className="status-pill">{members.length} total</span>
                </div>

                <ul className="mt-5 space-y-3">
                  {members.map((member) => {
                    const isOnline = onlineIds.has(member.userId);
                    const isSelf = member.userId === user?.id;

                    return (
                      <li key={member.id} className="presence-row">
                        <div>
                          <p className="font-semibold">
                            {member.user?.name ?? member.userId}
                            {isSelf ? " (You)" : ""}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[color:var(--text-soft)]">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={isOnline ? "status-pill-live" : "status-pill"}>
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
