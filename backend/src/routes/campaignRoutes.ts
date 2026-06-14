import { Router } from "express";
import {
  getCampaigns,
  getCampaignById,
  simulateCampaignHandler,
  generateMessages,
  sendCampaign,
  getCampaignCommunications,
} from "../controllers/campaignController";

const router = Router();

router.get("/", getCampaigns);
router.get("/:id", getCampaignById);
router.get("/:id/communications", getCampaignCommunications);
router.post("/simulate", simulateCampaignHandler);
router.post("/generate-messages", generateMessages);
router.post("/send", sendCampaign);

export default router;
