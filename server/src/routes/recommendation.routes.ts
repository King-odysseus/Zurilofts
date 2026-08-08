import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as ctrl from "../controllers/recommendation.controller.js";

const router = Router();

router.get("/", authenticate, ctrl.getRecommendations);

export default router;