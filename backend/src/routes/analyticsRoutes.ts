import { Router, Request, Response } from "express";
import {
  getAnalytics,
  getRevenueAttribution,
  getAIInsights,
  saveCampaignLearning,
  getRecommendations,
} from "../controllers/analyticsController";
import { getSessionTokenUsage } from "../services/geminiService";

const router = Router();

router.get("/", getAnalytics);
router.get("/revenue", getRevenueAttribution);
router.get("/insights", getAIInsights);
router.get("/recommendations", getRecommendations);
router.post("/save-learning", saveCampaignLearning);

// GET /api/analytics/token-usage — returns AI token consumption for this session
router.get("/token-usage", (_req: Request, res: Response) => {
  res.json(getSessionTokenUsage());
});

export default router;
