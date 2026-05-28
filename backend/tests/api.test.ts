import jwt from "jsonwebtoken";
import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const authService = vi.hoisted(() => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  getCurrentUser: vi.fn(),
  updateCurrentUser: vi.fn(),
}));

const roomService = vi.hoisted(() => ({
  createRoom: vi.fn(),
  getRoomDetails: vi.fn(),
  joinRoomByCode: vi.fn(),
  leaveRoom: vi.fn(),
  listRoomsForUser: vi.fn(),
}));

const sessionService = vi.hoisted(() => ({
  getDashboardAnalytics: vi.fn(),
  getRoomSessionHistory: vi.fn(),
  getSessionSyncForRoom: vi.fn(),
  startSession: vi.fn(),
  stopSession: vi.fn(),
}));

const socketMocks = vi.hoisted(() => ({
  emitSessionEnded: vi.fn(),
  emitSessionStarted: vi.fn(),
}));

vi.mock("../src/services/authService", () => authService);
vi.mock("../src/services/roomService", () => roomService);
vi.mock("../src/services/sessionService", () => sessionService);
vi.mock("../src/sockets", () => socketMocks);

const jwtSecret = "test-secret";
const userId = "user-123";
const roomId = "room-456";

const createAuthHeader = () => {
  const token = jwt.sign({ userId }, jwtSecret);
  return "Bearer " + token;
};

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = jwtSecret;
  process.env.JWT_EXPIRY = "7d";
  process.env.DATABASE_URL = "postgresql://localhost:5432/test";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.SOCKET_IO_CORS_ORIGIN = "http://localhost:5173";

  app = (await import("../src/app")).default;
});

describe("auth endpoints", () => {
  it("registers a user", async () => {
    authService.registerUser.mockResolvedValue({
      user: {
        id: userId,
        name: "Ada Lovelace",
        email: "ada@example.com",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      token: "token-123",
    });

    const response = await request(app).post("/api/auth/register").send({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      user: { id: userId, email: "ada@example.com" },
      token: "token-123",
    });
    expect(authService.registerUser).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "password123",
    });
  });

  it("logs in a user", async () => {
    authService.loginUser.mockResolvedValue({
      user: {
        id: userId,
        name: "Ada Lovelace",
        email: "ada@example.com",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      token: "token-456",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "ada@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      user: { id: userId, email: "ada@example.com" },
      token: "token-456",
    });
    expect(authService.loginUser).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password123",
    });
  });
});

describe("room endpoints", () => {
  it("creates a room for the authenticated user", async () => {
    roomService.createRoom.mockResolvedValue({
      id: roomId,
      name: "Focus Hall",
      code: "ABCD",
      createdById: userId,
      createdAt: "2025-02-01T00:00:00.000Z",
    });

    const response = await request(app)
      .post("/api/rooms")
      .set("Authorization", createAuthHeader())
      .send({ name: "Focus Hall" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ id: roomId, code: "ABCD" });
    expect(roomService.createRoom).toHaveBeenCalledWith(userId, "Focus Hall");
  });

  it("joins a room by code", async () => {
    roomService.joinRoomByCode.mockResolvedValue({
      id: roomId,
      name: "Focus Hall",
      code: "ABCD",
      createdById: userId,
      createdAt: "2025-02-01T00:00:00.000Z",
    });

    const response = await request(app)
      .post("/api/rooms/join")
      .set("Authorization", createAuthHeader())
      .send({ code: "abcd" });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: roomId, code: "ABCD" });
    expect(roomService.joinRoomByCode).toHaveBeenCalledWith(userId, "ABCD");
  });
});

describe("session endpoints", () => {
  it("starts a study session", async () => {
    const session = {
      id: "session-1",
      roomId,
      startedById: userId,
      startedAt: "2025-03-01T00:00:00.000Z",
      endedAt: null,
      duration: 900,
      trackedSeconds: 0,
      status: "active",
    };
    sessionService.startSession.mockResolvedValue(session);

    const response = await request(app)
      .post(`/api/rooms/${roomId}/sessions/start`)
      .set("Authorization", createAuthHeader())
      .send({ durationSeconds: 900 });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ id: "session-1", status: "active" });
    expect(sessionService.startSession).toHaveBeenCalledWith(userId, roomId, 900);
    expect(socketMocks.emitSessionStarted).toHaveBeenCalledWith(session);
  });

  it("ends an active session", async () => {
    const session = {
      id: "session-1",
      roomId,
      startedById: userId,
      startedAt: "2025-03-01T00:00:00.000Z",
      endedAt: "2025-03-01T00:15:00.000Z",
      duration: 900,
      trackedSeconds: 900,
      status: "completed",
    };
    sessionService.stopSession.mockResolvedValue(session);

    const response = await request(app)
      .post(`/api/rooms/${roomId}/sessions/stop`)
      .set("Authorization", createAuthHeader());

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: "session-1", status: "completed" });
    expect(sessionService.stopSession).toHaveBeenCalledWith(userId, roomId);
    expect(socketMocks.emitSessionEnded).toHaveBeenCalledWith(session);
  });
});
