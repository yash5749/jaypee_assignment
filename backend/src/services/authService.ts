import { User } from "@prisma/client";
import prisma from "../prisma";
import { HttpError } from "../utils/errors";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";

const toUserDto = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
});

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
}) => {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "Email already in use");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
    },
  });

  const token = signToken(user.id);

  return { user: toUserDto(user), token };
};

export const loginUser = async (input: {
  email: string;
  password: string;
}) => {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const matches = await comparePassword(input.password, user.password);
  if (!matches) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = signToken(user.id);

  return { user: toUserDto(user), token };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return toUserDto(user);
};

export const updateCurrentUser = async (
  userId: string,
  input: { name: string; email: string }
) => {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new HttpError(409, "Email already in use");
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
    },
  });

  return toUserDto(updated);
};
