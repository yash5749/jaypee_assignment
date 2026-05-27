import api from "./api";
import type { ApiResponse } from "../../../shared/api";
import type { MessageDto } from "../../../shared/types";

export const listRoomMessages = async (roomId: string) => {
  const { data } = await api.get<ApiResponse<MessageDto[]>>(
    `/api/rooms/${roomId}/messages`
  );
  return data.data;
};
