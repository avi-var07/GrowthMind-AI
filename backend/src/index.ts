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
import demoRoutes from "./routes/demoRoutes";

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

import axios from "axios";

// Check Channel Service
let channelServiceStatus = "unknown";
async function checkChannelService() {
  const url = process.env.CHANNEL_SERVICE_URL || "http://localhost:6000";
  try {
    await axios.get(`${url}/health`, { timeout: 2000 });
    channelServiceStatus = "online";
  } catch (err) {
    channelServiceStatus = "offline";
    console.warn(`[WARNING] Channel Service is OFFLINE at ${url}. Campaigns will fail to send!`);
  }
}

// Health check
app.get("/health", async (req, res) => {
  await checkChannelService();
  res.json({
    status: "ok",
    service: "GrowthMind AI Backend",
    port: PORT,
    channelService: channelServiceStatus
  });
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
app.use("/api/demo", demoRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` });
});

// Start server
async function start() {
  await connectDatabase();
  await checkChannelService();
  
  app.listen(PORT, () => {
    console.log(`🚀 GrowthMind AI Backend running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    if (channelServiceStatus === "offline") {
      console.log(`⚠️  WARNING: Channel Service is OFFLINE. Run 'npm run dev' in channel-service.`);
    }
  });

  // Start background reconciliation job
  startReconciliationJob();
}

start().catch(console.error);

export default app;
