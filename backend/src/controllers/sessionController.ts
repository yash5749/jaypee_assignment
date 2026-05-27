import { z } from "zod";
import {
  getDashboardAnalytics,
  getRoomSessionHistory,
  getSessionSyncForRoom,
  startSession,
  stopSession,
} from "../services/sessionService";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/errors";
import { emitSessionEnded, emitSessionStarted } from "../sockets";

const startSessionSchema = z.object({
  durationSeconds: z.number().int().min(300).max(4 * 60 * 60),
});

const getRoomId = (roomId: unknown) => {
  if (!roomId || Array.isArray(roomId) || typeof roomId !== "string") {
    throw new HttpError(400, "Invalid room id");
  }

  return roomId;
};

export const startSessionHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const parsed = startSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid session details");
  }

  const roomId = getRoomId(req.params.roomId);
  const session = await startSession(
    req.user.id,
    roomId,
    parsed.data.durationSeconds
  );

  emitSessionStarted(session);
  res.status(201).json({ data: session });
});

export const stopSessionHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const roomId = getRoomId(req.params.roomId);
  const session = await stopSession(req.user.id, roomId);

  emitSessionEnded(session);
  res.json({ data: session });
});

export const listRoomSessionsHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const roomId = getRoomId(req.params.roomId);
  const sessions = await getRoomSessionHistory(req.user.id, roomId);
  res.json({ data: sessions });
});

export const getSessionSyncHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const roomId = getRoomId(req.params.roomId);
  const session = await getSessionSyncForRoom(req.user.id, roomId);
  res.json({ data: session });
});

export const getDashboardAnalyticsHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const analytics = await getDashboardAnalytics(req.user.id);
  res.json({ data: analytics });
});
