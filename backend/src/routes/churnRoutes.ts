import { Router } from "express";
import {
  getChurnSummaryHandler,
  getAtRiskCustomers,
} from "../controllers/churnController";

const router = Router();

router.get("/summary", getChurnSummaryHandler);
router.get("/customers", getAtRiskCustomers);

export default router;
