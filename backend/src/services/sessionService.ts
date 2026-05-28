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

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;
const MONTH_IN_MS = 30 * DAY_IN_MS;

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

const getSessionStatus = (session: StudySession) => {
  if (!session.endedAt) {
    return "active" as const;
  }

  const trackedSeconds = calculateCompletedSeconds(session);
  if (session.duration && trackedSeconds >= session.duration - 1) {
    return "completed" as const;
  }

  return "left" as const;
};

const toSessionDto = (session: StudySession) => ({
  id: session.id,
  roomId: session.roomId,
  startedById: session.startedById,
  startedAt: session.startedAt.toISOString(),
  endedAt: session.endedAt ? session.endedAt.toISOString() : null,
  duration: session.duration ?? null,
  trackedSeconds: calculateCompletedSeconds(session),
  status: getSessionStatus(session),
});

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

const getWindowedStudySeconds = (
  sessions: StudySession[],
  windowStartTime: number
) => {
  return sessions.reduce((sum, session) => {
    if (session.startedAt.getTime() < windowStartTime) {
      return sum;
    }

    return sum + calculateCompletedSeconds(session);
  }, 0);
};

export const getDashboardAnalytics = async (userId: string) => {
  const roomMemberships = await prisma.roomMember.findMany({
    where: { userId },
    select: { roomId: true },
  });

  const currentRoomIds = roomMemberships.map((membership) => membership.roomId);

  await Promise.all(currentRoomIds.map((roomId) => syncActiveSessionState(roomId)));

  const [userSessions, userMessages] = await Promise.all([
    prisma.studySession.findMany({
      where: { startedById: userId },
      include: {
        room: true,
        startedBy: true,
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.message.findMany({
      where: { userId },
      include: {
        room: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Dashboard history should survive leaving a room, so analytics are derived
  // from the user's own sessions/messages rather than current membership alone.
  const activityRoomMap = new Map<string, RoomWithAnalytics>();

  for (const session of userSessions) {
    const existing = activityRoomMap.get(session.roomId);
    if (existing) {
      existing.sessions.push(session);
      continue;
    }

    activityRoomMap.set(session.roomId, {
      ...session.room,
      sessions: [session],
      messages: [],
    });
  }

  for (const message of userMessages) {
    const existing = activityRoomMap.get(message.roomId);
    if (existing) {
      existing.messages.push(message);
      continue;
    }

    activityRoomMap.set(message.roomId, {
      ...message.room,
      sessions: [],
      messages: [message],
    });
  }

  if (currentRoomIds.length === 0 && userSessions.length === 0 && userMessages.length === 0) {
    return {
      dailyStudySeconds: 0,
      weeklyStudySeconds: 0,
      monthlyStudySeconds: 0,
      totalStudySeconds: 0,
      totalSessions: 0,
      activeSessions: 0,
      roomSummaries: [],
      recentActivity: [],
    };
  }

  const roomSummaries = Array.from(activityRoomMap.values())
    .map((room) => buildRoomSummary(room))
    .sort((left, right) => right.totalStudySeconds - left.totalStudySeconds);

  const totalStudySeconds = userSessions.reduce((sum, session) => {
    return sum + calculateCompletedSeconds(session);
  }, 0);
  const totalSessions = userSessions.length;
  const activeSessions = await prisma.studySession.count({
    where: {
      roomId: { in: currentRoomIds },
      endedAt: null,
    },
  });

  const now = Date.now();
  const dailyStudySeconds = getWindowedStudySeconds(userSessions, now - DAY_IN_MS);
  const weeklyStudySeconds = getWindowedStudySeconds(userSessions, now - WEEK_IN_MS);
  const monthlyStudySeconds = getWindowedStudySeconds(
    userSessions,
    now - MONTH_IN_MS
  );

  const recentActivity = [
    ...userMessages.map((message) => toRecentMessage(message)),
    ...userSessions.flatMap((session) => toSessionActivities(session)),
  ]
    .sort((left, right) => {
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, 10);

  return {
    dailyStudySeconds,
    weeklyStudySeconds,
    monthlyStudySeconds,
    totalStudySeconds,
    totalSessions,
    activeSessions,
    roomSummaries,
    recentActivity,
  };
};
