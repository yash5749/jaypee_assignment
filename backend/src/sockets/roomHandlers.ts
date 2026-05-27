import type { Server } from "socket.io";
import prisma from "../prisma";
import { addPresence, listPresence, removePresence } from "./presence";
import type { AuthedSocket } from "./types";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../shared/socketEvents";
import { createMessage } from "../services/messageService";
import {
  getActiveSessionForRoom,
  startSession,
  stopSession,
} from "../services/sessionService";

export const registerRoomHandlers = (
  io: Server,
  socket: AuthedSocket
) => {
  const userId = socket.data.userId;
  const getRoomId = (payload: { roomId: string }) => payload.roomId;
  const emitSocketError = (message: string) => {
    socket.emit(ServerToClientEvents.Error, { message });
  };
  const emitMembers = (roomId: string) => {
    io.to(roomId).emit(ServerToClientEvents.RoomMembersUpdated, {
      roomId,
      members: listPresence(roomId),
    });
  };
  const wrap = <T,>(handler: (payload: T) => Promise<void> | void) => {
    return async (payload: T) => {
      try {
        await handler(payload);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Something went wrong";
        emitSocketError(message);
      }
    };
  };

  socket.on(
    ClientToServerEvents.JoinRoom,
    wrap(async (payload: { roomId: string }) => {
      const roomId = getRoomId(payload);
      if (!roomId || typeof roomId !== "string") {
        emitSocketError("Invalid room id");
        return;
      }

      const membership = await prisma.roomMember.findUnique({
        where: {
          userId_roomId: {
            userId,
            roomId,
          },
        },
      });

      if (!membership) {
        emitSocketError("Not a member of this room");
        return;
      }

      socket.join(roomId);
      socket.data.joinedRooms.add(roomId);
      addPresence(roomId, userId);
      emitMembers(roomId);
      socket.emit(ServerToClientEvents.SessionSync, {
        roomId,
        session: await getActiveSessionForRoom(roomId),
      });
    })
  );

  socket.on(ClientToServerEvents.LeaveRoom, wrap((payload: { roomId: string }) => {
    const roomId = getRoomId(payload);
    if (!roomId || typeof roomId !== "string") {
      emitSocketError("Invalid room id");
      return;
    }

    socket.leave(roomId);
    socket.data.joinedRooms.delete(roomId);
    removePresence(roomId, userId);
    emitMembers(roomId);
  }));

  socket.on(
    ClientToServerEvents.SendMessage,
    wrap(async (payload: { roomId: string; content: string }) => {
      const roomId = payload.roomId;
      const content = payload.content?.trim();
      if (!roomId || typeof roomId !== "string" || !content) {
        emitSocketError("Invalid message payload");
        return;
      }

      const message = await createMessage(userId, roomId, content);
      io.to(roomId).emit(ServerToClientEvents.ReceiveMessage, { message });
    })
  );

  socket.on(
    ClientToServerEvents.RequestSync,
    wrap(async (payload: { roomId: string }) => {
      const roomId = getRoomId(payload);
      if (!roomId || typeof roomId !== "string") {
        emitSocketError("Invalid room id");
        return;
      }

      socket.emit(ServerToClientEvents.RoomMembersUpdated, {
        roomId,
        members: listPresence(roomId),
      });
      socket.emit(ServerToClientEvents.SessionSync, {
        roomId,
        session: await getActiveSessionForRoom(roomId),
      });
    })
  );

  socket.on(
    ClientToServerEvents.StartSession,
    wrap(async (payload: { roomId: string; durationSeconds: number }) => {
      const roomId = getRoomId(payload);
      const durationSeconds = payload.durationSeconds;
      if (
        !roomId ||
        typeof roomId !== "string" ||
        !Number.isInteger(durationSeconds) ||
        durationSeconds < 300 ||
        durationSeconds > 4 * 60 * 60
      ) {
        emitSocketError("Invalid session payload");
        return;
      }

      const session = await startSession(userId, roomId, durationSeconds);
      io.to(roomId).emit(ServerToClientEvents.SessionStarted, { session });
    })
  );

  socket.on(
    ClientToServerEvents.StopSession,
    wrap(async (payload: { roomId: string }) => {
      const roomId = getRoomId(payload);
      if (!roomId || typeof roomId !== "string") {
        emitSocketError("Invalid room id");
        return;
      }

      const session = await stopSession(userId, roomId);
      io.to(roomId).emit(ServerToClientEvents.SessionEnded, { session });
    })
  );

  socket.on("disconnect", () => {
    for (const roomId of socket.data.joinedRooms) {
      removePresence(roomId, userId);
      emitMembers(roomId);
    }
    socket.data.joinedRooms.clear();
  });
};
