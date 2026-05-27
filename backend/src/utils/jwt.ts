import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
}

const getJwtSecret = () => {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not set");
  }
  return env.jwtSecret;
};

export const signToken = (userId: string) => {
  const expiresIn = env.jwtExpiry as SignOptions["expiresIn"];
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
};
