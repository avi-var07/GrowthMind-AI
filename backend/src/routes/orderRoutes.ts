import { Router } from "express";
import multer from "multer";
import { getOrders, uploadOrders, getOrderStats } from "../controllers/orderController";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getOrders);
router.get("/stats", getOrderStats);
router.post("/upload", upload.single("file"), uploadOrders);

export default router;
