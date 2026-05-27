import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/errors";
import { listRoomMessages } from "../services/messageService";

export const listRoomMessagesHandler = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }

  const roomId = req.params.roomId;
  if (!roomId || Array.isArray(roomId)) {
    throw new HttpError(400, "Invalid room id");
  }

  const messages = await listRoomMessages(req.user.id, roomId);
  res.json({ data: messages });
});
