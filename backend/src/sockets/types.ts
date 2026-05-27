import type { DefaultEventsMap, Socket } from "socket.io";

export interface SocketData {
  userId: string;
  joinedRooms: Set<string>;
}

export type AuthedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;
