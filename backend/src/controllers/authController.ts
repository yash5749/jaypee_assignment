import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/errors";
import { getCurrentUser, loginUser, registerUser } from "../services/authService";

const registerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid registration details");
  }

  const result = await registerUser(parsed.data);
  res.status(201).json({ data: result });
});

export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid login details");
  }

  const result = await loginUser(parsed.data);
  res.json({ data: result });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const user = await getCurrentUser(req.user.id);
  res.json({ data: user });
});
