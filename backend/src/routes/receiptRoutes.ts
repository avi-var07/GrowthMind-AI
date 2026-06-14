import { Router } from "express";
import { handleReceipt } from "../controllers/receiptController";

const router = Router();

// This endpoint is called by the Channel Service as async callback
router.post("/", handleReceipt);

export default router;
