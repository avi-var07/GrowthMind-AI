import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database";
import { startReconciliationJob } from "./jobs/reconciliationJob";

// Load environment variables
dotenv.config();

// Import routes
import customerRoutes from "./routes/customerRoutes";
import orderRoutes from "./routes/orderRoutes";
import churnRoutes from "./routes/churnRoutes";
import segmentationRoutes from "./routes/segmentationRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import receiptRoutes from "./routes/receiptRoutes";
import adminRoutes from "./routes/adminRoutes";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "GrowthMind AI Backend", port: PORT });
});

// API Routes
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/churn", churnRoutes);
app.use("/api/segment", segmentationRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/receipt", receiptRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` });
});

// Start server
async function start() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 GrowthMind AI Backend running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });

  // Start background reconciliation job
  startReconciliationJob();
}

start().catch(console.error);

export default app;
