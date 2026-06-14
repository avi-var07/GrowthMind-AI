import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 6000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "GrowthMind Channel Service (Stub)",
    port: PORT,
  });
});

// POST /send - Stubbed message sending endpoint
// Simulates WhatsApp/Email delivery with realistic probabilities
app.post("/send", async (req, res) => {
  const { communicationId, campaignId, customerId, channel, message, callbackUrl } =
    req.body;

  if (!campaignId || !customerId || !callbackUrl) {
    console.error(`[Channel] Rejecting send request: missing fields.`);
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Immediately acknowledge receipt
  console.log(`[Channel Service] Received request to send ${channel} message for comm ${communicationId}`);
  res.json({ accepted: true, communicationId });

  // Simulate async delivery with random delays
  // This represents real-world message delivery latency
  simulateDelivery({
    communicationId,
    campaignId,
    customerId,
    channel,
    callbackUrl,
  });
});

// Simulates the delivery pipeline asynchronously
// Uses weighted random probabilities to simulate real-world outcomes
async function simulateDelivery(params: {
  communicationId: string;
  campaignId: string;
  customerId: string;
  channel: string;
  callbackUrl: string;
}) {
  const { communicationId, campaignId, customerId, callbackUrl } = params;

  try {
    // Step 1: Simulate delivery (random delay 1-3 seconds)
    await sleep(randomBetween(1000, 3000));

    // 10% chance of immediate failure
    if (Math.random() < 0.1) {
      await sendCallback(callbackUrl, { communicationId, campaignId, customerId, status: "FAILED" });
      return;
    }

    // 90% chance of delivery
    await sendCallback(callbackUrl, { communicationId, campaignId, customerId, status: "DELIVERED" });

    // Step 2: Simulate open (50% of delivered messages are opened)
    await sleep(randomBetween(2000, 5000));
    if (Math.random() < 0.5) {
      await sendCallback(callbackUrl, { communicationId, campaignId, customerId, status: "OPENED" });

      // Step 3: Simulate click (20% of opened messages are clicked)
      await sleep(randomBetween(1000, 3000));
      if (Math.random() < 0.2) {
        await sendCallback(callbackUrl, { communicationId, campaignId, customerId, status: "CLICKED" });
      }
    }
  } catch (error) {
    console.error(`Delivery simulation error for ${communicationId}:`, error);
    // Try to send failure status
    try {
      await sendCallback(callbackUrl, { communicationId, campaignId, customerId, status: "FAILED" });
    } catch {}
  }
}

// Send callback to CRM backend
async function sendCallback(
  callbackUrl: string,
  payload: {
    communicationId: string;
    campaignId: string;
    customerId: string;
    status: string;
  }
) {
  try {
    console.log(`[Channel Service] Dispatching callback to CRM for comm ${payload.communicationId} with status ${payload.status}`);
    await axios.post(callbackUrl, payload, { timeout: 5000 });
    console.log(
      `[Channel Service] Callback successfully sent: comm=${payload.communicationId}, status=${payload.status}`
    );
  } catch (error) {
    console.error("[Channel] Callback failed:", error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.listen(PORT, () => {
  console.log(`📡 Channel Service running on port ${PORT}`);
  console.log(`   Simulating: WhatsApp & Email delivery`);
  console.log(`   Rates: 90% delivery, 50% open, 20% click, 10% fail`);
});

export default app;
