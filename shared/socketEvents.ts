export const ClientToServerEvents = {
  JoinRoom: "join-room",
  LeaveRoom: "leave-room",
  SendMessage: "send-message",
  StartSession: "start-session",
  StopSession: "stop-session",
  RequestSync: "request-sync",
} as const;

export const ServerToClientEvents = {
  RoomMembersUpdated: "room-members-updated",
  ReceiveMessage: "receive-message",
  SessionStarted: "session-started",
  SessionEnded: "session-ended",
  SessionSync: "session-sync",
  Error: "error",
} as const;

export type ClientToServerEvent =
  (typeof ClientToServerEvents)[keyof typeof ClientToServerEvents];
export type ServerToClientEvent =
  (typeof ServerToClientEvents)[keyof typeof ServerToClientEvents];
