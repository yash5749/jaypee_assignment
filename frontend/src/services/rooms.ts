import api from "./api";
import type { ApiResponse } from "../../../shared/api";
import type { RoomMemberDto, StudyRoomDto } from "../../../shared/types";

export interface RoomDetails {
  room: StudyRoomDto;
  members: RoomMemberDto[];
}

export const createRoom = async (name: string) => {
  const { data } = await api.post<ApiResponse<StudyRoomDto>>("/api/rooms", {
    name,
  });
  return data.data;
};

export const joinRoom = async (code: string) => {
  const { data } = await api.post<ApiResponse<StudyRoomDto>>("/api/rooms/join", {
    code,
  });
  return data.data;
};

export const listRooms = async () => {
  const { data } = await api.get<ApiResponse<StudyRoomDto[]>>("/api/rooms");
  return data.data;
};

export const getRoomDetails = async (roomId: string) => {
  const { data } = await api.get<ApiResponse<RoomDetails>>(
    `/api/rooms/${roomId}`
  );
  return data.data;
};

export const leaveRoom = async (roomId: string) => {
  const { data } = await api.post<ApiResponse<{ roomId: string }>>(
    `/api/rooms/${roomId}/leave`
  );
  return data.data;
};
