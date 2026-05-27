import { RequestHandler } from "express";
import { verifyToken } from "../utils/jwt";

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
