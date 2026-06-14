import { Router } from "express";
import { chatSegment } from "../controllers/segmentationController";

const router = Router();

router.post("/chat", chatSegment);

export default router;
