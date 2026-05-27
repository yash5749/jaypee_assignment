import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { env } from "../config/env";
import { verifyToken } from "../utils/jwt";
import { registerRoomHandlers } from "./roomHandlers";
import type { AuthedSocket } from "./types";
import { ServerToClientEvents } from "../../../shared/socketEvents";
import {
  initializeActiveSessionSchedules,
  setSessionEndedListener,
} from "../services/sessionService";

let ioInstance: Server | null = null;

export const getIo = () => ioInstance;

export const emitSessionStarted = (session: { roomId: string }) => {
  ioInstance?.to(session.roomId).emit(ServerToClientEvents.SessionStarted, {
    session,
  });
};

export const emitSessionEnded = (session: { roomId: string }) => {
  ioInstance?.to(session.roomId).emit(ServerToClientEvents.SessionEnded, {
    session,
  });
};

export const initSockets = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: env.socketCorsOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Unauthorized"));
    }

    try {
      const payload = verifyToken(token);
      const authedSocket = socket as AuthedSocket;
      authedSocket.data.userId = payload.userId;
      authedSocket.data.joinedRooms = new Set<string>();
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket as AuthedSocket);
  });

  ioInstance = io;
  setSessionEndedListener((session) => {
    emitSessionEnded(session);
  });
  void initializeActiveSessionSchedules();

  return io;
};
