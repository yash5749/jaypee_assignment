import api from "./api";
import type { ApiResponse } from "../../../shared/api";
import type { UserDto } from "../../../shared/types";

export interface AuthPayload {
  user: UserDto;
  token: string;
}

export const register = async (input: {
  name: string;
  email: string;
  password: string;
}) => {
  const { data } = await api.post<ApiResponse<AuthPayload>>(
    "/api/auth/register",
    input
  );
  return data.data;
};

export const login = async (input: { email: string; password: string }) => {
  const { data } = await api.post<ApiResponse<AuthPayload>>(
    "/api/auth/login",
    input
  );
  return data.data;
};

export const me = async () => {
  const { data } = await api.get<ApiResponse<UserDto>>("/api/auth/me");
  return data.data;
};
