import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().trim().min(1).default("http://localhost:5173"),
  SOCKET_IO_CORS_ORIGIN: z
    .string()
    .trim()
    .min(1)
    .default("http://localhost:5173"),
  JWT_SECRET: z.string().trim().min(1, "JWT_SECRET is required"),
  JWT_EXPIRY: z.string().trim().min(1).default("7d"),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
});

const parsedEnv = envSchema.parse(process.env);

const parseOrigins = (value: string) => {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const env = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  corsOrigin: parseOrigins(parsedEnv.CORS_ORIGIN),
  socketCorsOrigin: parseOrigins(parsedEnv.SOCKET_IO_CORS_ORIGIN),
  jwtSecret: parsedEnv.JWT_SECRET,
  jwtExpiry: parsedEnv.JWT_EXPIRY,
  databaseUrl: parsedEnv.DATABASE_URL,
};
