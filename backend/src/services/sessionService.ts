import type {
  Message,
  StudyRoom,
  StudySession,
  User,
} from "@prisma/client";
import prisma from "../prisma";
import { HttpError } from "../utils/errors";
import { ensureRoomMember } from "./roomService";

const scheduledRoomTimers = new Map<string, NodeJS.Timeout>();

type SessionEndedListener = (session: ReturnType<typeof toSessionDto>) => void;

let sessionEndedListener: SessionEndedListener | null = null;

const toSessionDto = (session: StudySession) => ({
  id: session.id,
  roomId: session.roomId,
  startedById: session.startedById,
  startedAt: session.startedAt.toISOString(),
  endedAt: session.endedAt ? session.endedAt.toISOString() : null,
  duration: session.duration ?? null,
});

const getSessionDeadline = (session: StudySession) => {
  if (!session.duration) {
    return null;
  }

  return new Date(session.startedAt.getTime() + session.duration * 1000);
};

const calculateCompletedSeconds = (session: StudySession) => {
  const endTime = session.endedAt ?? new Date();
  const elapsedSeconds = Math.max(
    0,
    Math.round((endTime.getTime() - session.startedAt.getTime()) / 1000)
  );

  if (!session.duration) {
    return elapsedSeconds;
  }

  return Math.min(elapsedSeconds, session.duration);
};

const clearScheduledRoomTimer = (roomId: string) => {
  const existing = scheduledRoomTimers.get(roomId);
  if (!existing) {
    return;
  }

  clearTimeout(existing);
  scheduledRoomTimers.delete(roomId);
};

const updateSessionEndedAt = async (session: StudySession, endedAt: Date) => {
  const updated = await prisma.studySession.update({
    where: { id: session.id },
    data: { endedAt },
  });

  clearScheduledRoomTimer(session.roomId);
  return updated;
};

const getLatestActiveSession = async (roomId: string) => {
  return prisma.studySession.findFirst({
    where: {
      roomId,
      endedAt: null,
    },
    orderBy: {
      startedAt: "desc",
    },
  });
};

const syncActiveSessionState = async (roomId: string) => {
  const activeSession = await getLatestActiveSession(roomId);
  if (!activeSession) {
    clearScheduledRoomTimer(roomId);
    return null;
  }

  const deadline = getSessionDeadline(activeSession);
  if (deadline && deadline.getTime() <= Date.now()) {
    const endedSession = await updateSessionEndedAt(activeSession, deadline);
    sessionEndedListener?.(toSessionDto(endedSession));
    return null;
  }

  return activeSession;
};

const scheduleSessionEnd = (session: StudySession) => {
  clearScheduledRoomTimer(session.roomId);

  const deadline = getSessionDeadline(session);
  if (!deadline) {
    return;
  }

  const delay = deadline.getTime() - Date.now();
  if (delay <= 0) {
    void syncActiveSessionState(session.roomId);
    return;
  }

  const timeout = setTimeout(() => {
    void syncActiveSessionState(session.roomId);
  }, delay);

  scheduledRoomTimers.set(session.roomId, timeout);
};

export const setSessionEndedListener = (listener: SessionEndedListener) => {
  sessionEndedListener = listener;
};

export const initializeActiveSessionSchedules = async () => {
  const activeSessions = await prisma.studySession.findMany({
    where: { endedAt: null },
  });

  for (const session of activeSessions) {
    const synced = await syncActiveSessionState(session.roomId);
    if (synced) {
      scheduleSessionEnd(synced);
    }
  }
};

export const getActiveSessionForRoom = async (roomId: string) => {
  const session = await syncActiveSessionState(roomId);
  if (!session) {
    return null;
  }

  scheduleSessionEnd(session);
  return toSessionDto(session);
};

export const getSessionSyncForRoom = async (userId: string, roomId: string) => {
  await ensureRoomMember(userId, roomId);
  return getActiveSessionForRoom(roomId);
};

export const startSession = async (
  userId: string,
  roomId: string,
  durationSeconds: number
) => {
  await ensureRoomMember(userId, roomId);

  const active = await syncActiveSessionState(roomId);
  if (active) {
    throw new HttpError(400, "A session is already active");
  }

  const session = await prisma.studySession.create({
    data: {
      roomId,
      startedById: userId,
      duration: durationSeconds,
    },
  });

  scheduleSessionEnd(session);
  return toSessionDto(session);
};

export const stopSession = async (userId: string, roomId: string) => {
  await ensureRoomMember(userId, roomId);

  const active = await syncActiveSessionState(roomId);
  if (!active) {
    throw new HttpError(400, "No active session to stop");
  }

  const session = await updateSessionEndedAt(active, new Date());
  return toSessionDto(session);
};

export const getRoomSessionHistory = async (userId: string, roomId: string) => {
  await ensureRoomMember(userId, roomId);

  const sessions = await prisma.studySession.findMany({
    where: { roomId },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return sessions.map((session) => toSessionDto(session));
};

type RoomWithAnalytics = StudyRoom & {
  sessions: StudySession[];
  messages: Message[];
};

const buildRoomSummary = (room: RoomWithAnalytics) => {
  const totalStudySeconds = room.sessions.reduce((sum, session) => {
    return sum + calculateCompletedSeconds(session);
  }, 0);

  return {
    roomId: room.id,
    roomName: room.name,
    roomCode: room.code,
    totalStudySeconds,
    totalSessions: room.sessions.length,
    totalMessages: room.messages.length,
  };
};

type MessageWithRelations = Message & {
  user: User;
  room: StudyRoom;
};

type SessionWithRelations = StudySession & {
  startedBy: User;
  room: StudyRoom;
};

const toRecentMessage = (message: MessageWithRelations) => ({
  type: "message" as const,
  roomId: message.roomId,
  roomName: message.room.name,
  createdAt: message.createdAt.toISOString(),
  userId: message.userId,
  userName: message.user.name,
  content: message.content,
});

const toSessionActivities = (session: SessionWithRelations) => {
  const activities: Array<{
    type: "session-started" | "session-ended";
    roomId: string;
    roomName: string;
    createdAt: string;
    userId: string;
    userName: string;
    durationSeconds?: number;
  }> = [
    {
      type: "session-started" as const,
      roomId: session.roomId,
      roomName: session.room.name,
      createdAt: session.startedAt.toISOString(),
      userId: session.startedById,
      userName: session.startedBy.name,
      durationSeconds: session.duration ?? undefined,
    },
  ];

  if (session.endedAt) {
    activities.push({
      type: "session-ended" as const,
      roomId: session.roomId,
      roomName: session.room.name,
      createdAt: session.endedAt.toISOString(),
      userId: session.startedById,
      userName: session.startedBy.name,
      durationSeconds: calculateCompletedSeconds(session),
    });
  }

  return activities;
};

export const getDashboardAnalytics = async (userId: string) => {
  const roomMemberships = await prisma.roomMember.findMany({
    where: { userId },
    select: { roomId: true },
  });

  const roomIds = roomMemberships.map((membership) => membership.roomId);
  if (roomIds.length === 0) {
    return {
      totalStudySeconds: 0,
      totalSessions: 0,
      activeSessions: 0,
      roomSummaries: [],
      recentActivity: [],
    };
  }

  await Promise.all(roomIds.map((roomId) => syncActiveSessionState(roomId)));

  const [rooms, messages, sessions] = await Promise.all([
    prisma.studyRoom.findMany({
      where: { id: { in: roomIds } },
      include: {
        sessions: true,
        messages: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.findMany({
      where: { roomId: { in: roomIds } },
      include: {
        user: true,
        room: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.studySession.findMany({
      where: { roomId: { in: roomIds } },
      include: {
        startedBy: true,
        room: true,
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  const roomSummaries = rooms
    .map((room) => buildRoomSummary(room))
    .sort((left, right) => right.totalStudySeconds - left.totalStudySeconds);

  const totalStudySeconds = roomSummaries.reduce(
    (sum, room) => sum + room.totalStudySeconds,
    0
  );
  const totalSessions = rooms.reduce((sum, room) => sum + room.sessions.length, 0);
  const activeSessions = rooms.reduce((sum, room) => {
    return sum + room.sessions.filter((session) => !session.endedAt).length;
  }, 0);

  const recentActivity = [
    ...messages.map((message) => toRecentMessage(message)),
    ...sessions.flatMap((session) => toSessionActivities(session)),
  ]
    .sort((left, right) => {
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, 10);

  return {
    totalStudySeconds,
    totalSessions,
    activeSessions,
    roomSummaries,
    recentActivity,
  };
};
