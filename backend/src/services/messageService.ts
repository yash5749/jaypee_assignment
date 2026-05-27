import type { Message, User } from "@prisma/client";
import prisma from "../prisma";
import { ensureRoomMember } from "./roomService";

const toMessageDto = (message: Message & { user?: User }) => ({
  id: message.id,
  content: message.content,
  userId: message.userId,
  roomId: message.roomId,
  createdAt: message.createdAt.toISOString(),
  user: message.user
    ? {
        id: message.user.id,
        name: message.user.name,
        email: message.user.email,
        createdAt: message.user.createdAt.toISOString(),
      }
    : undefined,
});

export const createMessage = async (
  userId: string,
  roomId: string,
  content: string
) => {
  await ensureRoomMember(userId, roomId);

  const message = await prisma.message.create({
    data: {
      content,
      userId,
      roomId,
    },
    include: {
      user: true,
    },
  });

  return toMessageDto(message);
};

export const listRoomMessages = async (userId: string, roomId: string) => {
  await ensureRoomMember(userId, roomId);

  const messages = await prisma.message.findMany({
    where: { roomId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((message) => toMessageDto(message));
};
