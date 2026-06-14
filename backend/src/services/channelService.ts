import axios from "axios";

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL;

export async function checkChannelServiceHealth(): Promise<boolean> {
  try {
    await axios.get(`${CHANNEL_SERVICE_URL}/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Send a message via the Channel Service (stub)
// The channel service simulates delivery and calls back asynchronously
export async function sendToChannelService(payload: {
  communicationId: string;
  campaignId: string;
  customerId: string;
  channel: "whatsapp" | "email";
  message: string;
}): Promise<void> {
  try {
    console.log(`[CRM Send API] Dispatching comm ${payload.communicationId} to Channel Service`);
    await axios.post(`${CHANNEL_SERVICE_URL}/send`, payload, { timeout: 5000 });
    console.log(`[CRM Send API] Successfully dispatched comm ${payload.communicationId}`);
  } catch (error) {
    // Channel service might be down - log but don't crash
    console.error(`[CRM Send API] Channel service call failed for comm ${payload.communicationId}:`, error);
    throw error;
  }
}
