import axios from "axios";

const CHANNEL_SERVICE_URL =
  process.env.CHANNEL_SERVICE_URL || "http://localhost:6000";

// Send a message via the Channel Service (stub)
// The channel service simulates delivery and calls back asynchronously
export async function sendToChannelService(payload: {
  communicationId: string;
  campaignId: string;
  customerId: string;
  channel: "whatsapp" | "email";
  message: string;
  callbackUrl: string;
}): Promise<void> {
  try {
    await axios.post(`${CHANNEL_SERVICE_URL}/send`, payload, { timeout: 5000 });
  } catch (error) {
    // Channel service might be down - log but don't crash
    console.error("Channel service call failed:", error);
    throw error;
  }
}
