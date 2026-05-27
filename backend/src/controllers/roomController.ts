import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/errors";
import {
  createRoom,
  getRoomDetails,
  joinRoomByCode,
  leaveRoom,
  listRoomsForUser,
} from "../services/roomService";

const createRoomSchema = z.object({
  name: z.string().trim().min(1),
});

const joinRoomSchema = z.object({
  code: z.string().trim().min(4),
});

export const createRoomHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid room details");
  }

  const room = await createRoom(req.user.id, parsed.data.name);
  res.status(201).json({ data: room });
});

export const joinRoomHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const parsed = joinRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid room code");
  }

  const room = await joinRoomByCode(req.user.id, parsed.data.code.toUpperCase());
  res.json({ data: room });
});

export const listRoomsHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const rooms = await listRoomsForUser(req.user.id);
  res.json({ data: rooms });
});

export const getRoomDetailsHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const roomId = req.params.roomId;
  if (!roomId || Array.isArray(roomId)) {
    throw new HttpError(400, "Invalid room id");
  }

  const details = await getRoomDetails(req.user.id, roomId);
  res.json({ data: details });
});

export const leaveRoomHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const roomId = req.params.roomId;
  if (!roomId || Array.isArray(roomId)) {
    throw new HttpError(400, "Invalid room id");
  }

  const result = await leaveRoom(req.user.id, roomId);
  res.json({ data: result });
});
