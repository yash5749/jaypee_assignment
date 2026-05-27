import prisma from "../prisma";
import { HttpError } from "../utils/errors";
import { generateRoomCode } from "../utils/roomCode";
import type { RoomMember, StudyRoom, User } from "@prisma/client";

const toRoomDto = (room: StudyRoom) => ({
  id: room.id,
  name: room.name,
  code: room.code,
  createdById: room.createdById,
  createdAt: room.createdAt.toISOString(),
});

const toMemberDto = (member: RoomMember & { user?: User }) => ({
  id: member.id,
  userId: member.userId,
  roomId: member.roomId,
  joinedAt: member.joinedAt.toISOString(),
  user: member.user
    ? {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        createdAt: member.user.createdAt.toISOString(),
      }
    : undefined,
});

export const ensureRoomMember = async (userId: string, roomId: string) => {
  const membership = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
    },
  });

  if (!membership) {
    throw new HttpError(403, "Not a member of this room");
  }

  return membership;
};

const createUniqueRoomCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRoomCode();
    const existing = await prisma.studyRoom.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
  }

  throw new HttpError(500, "Failed to generate room code");
};

export const createRoom = async (userId: string, name: string) => {
  const code = await createUniqueRoomCode();

  const room = await prisma.$transaction(async (tx) => {
    const createdRoom = await tx.studyRoom.create({
      data: {
        name,
        code,
        createdById: userId,
      },
    });

    await tx.roomMember.create({
      data: {
        roomId: createdRoom.id,
        userId,
      },
    });

    return createdRoom;
  });

  return toRoomDto(room);
};

export const joinRoomByCode = async (userId: string, code: string) => {
  const room = await prisma.studyRoom.findUnique({ where: { code } });
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  const existing = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId: room.id,
      },
    },
  });

  if (!existing) {
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId,
      },
    });
  }

  return toRoomDto(room);
};

export const listRoomsForUser = async (userId: string) => {
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    include: {
      room: true,
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  return memberships.map((membership) => toRoomDto(membership.room));
};

export const getRoomDetails = async (userId: string, roomId: string) => {
  await ensureRoomMember(userId, roomId);

  const room = await prisma.studyRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: {
      user: true,
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  return {
    room: toRoomDto(room),
    members: members.map((member) => toMemberDto(member)),
  };
};

export const leaveRoom = async (userId: string, roomId: string) => {
  await ensureRoomMember(userId, roomId);

  await prisma.roomMember.delete({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
    },
  });

  return { roomId };
};
