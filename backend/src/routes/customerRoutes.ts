import { Router } from "express";
import multer from "multer";
import {
  getCustomers,
  uploadCustomers,
  getCustomerStats,
} from "../controllers/customerController";

const router = Router();
// Store file in memory buffer for CSV parsing
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getCustomers);
router.get("/stats", getCustomerStats);
router.post("/upload", upload.single("file"), uploadCustomers);

export default router;
