import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createRoomHandler,
  getRoomDetailsHandler,
  joinRoomHandler,
  leaveRoomHandler,
  listRoomsHandler,
} from "../controllers/roomController";
import { listRoomMessagesHandler } from "../controllers/messageController";
import {
  getSessionSyncHandler,
  listRoomSessionsHandler,
  startSessionHandler,
  stopSessionHandler,
} from "../controllers/sessionController";

const router = Router();

router.use(requireAuth);

router.post("/", createRoomHandler);
router.post("/join", joinRoomHandler);
router.get("/", listRoomsHandler);
router.get("/:roomId", getRoomDetailsHandler);
router.get("/:roomId/messages", listRoomMessagesHandler);
router.get("/:roomId/sessions", listRoomSessionsHandler);
router.get("/:roomId/session-sync", getSessionSyncHandler);
router.post("/:roomId/sessions/start", startSessionHandler);
router.post("/:roomId/sessions/stop", stopSessionHandler);
router.post("/:roomId/leave", leaveRoomHandler);

export default router;
