import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboardAnalyticsHandler } from "../controllers/sessionController";

const router = Router();

router.use(requireAuth);
router.get("/analytics", getDashboardAnalyticsHandler);

export default router;
