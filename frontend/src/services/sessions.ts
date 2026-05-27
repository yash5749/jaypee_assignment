import type { ApiResponse } from "../../../shared/api";
import type {
  SessionAnalyticsDto,
  StudySessionDto,
} from "../../../shared/types";
import api from "./api";

export const listRoomSessions = async (roomId: string) => {
  const { data } = await api.get<ApiResponse<StudySessionDto[]>>(
    `/api/rooms/${roomId}/sessions`
  );
  return data.data;
};

export const getRoomSessionSync = async (roomId: string) => {
  const { data } = await api.get<ApiResponse<StudySessionDto | null>>(
    `/api/rooms/${roomId}/session-sync`
  );
  return data.data;
};

export const startRoomSession = async (
  roomId: string,
  durationSeconds: number
) => {
  const { data } = await api.post<ApiResponse<StudySessionDto>>(
    `/api/rooms/${roomId}/sessions/start`,
    { durationSeconds }
  );
  return data.data;
};

export const stopRoomSession = async (roomId: string) => {
  const { data } = await api.post<ApiResponse<StudySessionDto>>(
    `/api/rooms/${roomId}/sessions/stop`
  );
  return data.data;
};

export const getDashboardAnalytics = async () => {
  const { data } = await api.get<ApiResponse<SessionAnalyticsDto>>(
    "/api/dashboard/analytics"
  );
  return data.data;
};
