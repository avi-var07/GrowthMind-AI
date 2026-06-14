import axios from "axios";
import mongoose from "mongoose";
import { connectDatabase } from "./src/config/database";
import CustomerProfile from "./src/models/CustomerProfile";
import Campaign from "./src/models/Campaign";
import Communication from "./src/models/Communication";

async function runAudit() {
  await connectDatabase();

  console.log("==================================================");
  console.log("STAGE 1: Finding 100+ Users Segment");
  console.log("==================================================");
  
  // Find all high risk churn customers directly to ensure >100
  const matchedProfiles = await CustomerProfile.find({ churnRisk: "high" });
  console.log(`Found ${matchedProfiles.length} high-risk churn customers.`);

  if (matchedProfiles.length < 100) {
    console.error("Less than 100 users! Cannot proceed.");
    process.exit(1);
  }

  const audienceIds = matchedProfiles.map(p => p.customerId.toString());

  console.log("\n==================================================");
  console.log("STAGE 2: Calling CRM Send API");
  console.log("==================================================");

  const payload = {
    name: "Winback E2E Test",
    audienceIds,
    whatsappMessage: "Hey, come back to Brew & Grow!",
    emailMessage: "Hey, come back to Brew & Grow!"
  };

  let campaignId;
  try {
    const res = await axios.post("http://localhost:5000/api/campaigns/send", payload);
    campaignId = res.data.campaignId;
    console.log(`Successfully dispatched campaign! ID: ${campaignId}`);
  } catch (error: any) {
    console.error("Failed to send campaign via API:", error.response?.data || error.message);
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("STAGE 3: Waiting for Callbacks...");
  console.log("==================================================");

  // Poll DB for communication statuses
  for (let i = 0; i < 15; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const comms = await Communication.find({ campaignId });
    
    let pending = 0, delivered = 0, opened = 0, clicked = 0, failed = 0;
    comms.forEach(c => {
      if (c.status === "PENDING") pending++;
      if (c.status === "DELIVERED") delivered++;
      if (c.status === "OPENED") opened++;
      if (c.status === "CLICKED") clicked++;
      if (c.status === "FAILED") failed++;
    });

    console.log(`[Poll ${i+1}/15] Pending: ${pending} | Delivered: ${delivered} | Opened: ${opened} | Clicked: ${clicked} | Failed: ${failed}`);
  }

  console.log("\n==================================================");
  console.log("FINAL RESULTS");
  console.log("==================================================");
  
  const finalComms = await Communication.find({ campaignId });
  let delivered = 0, opened = 0, clicked = 0, failed = 0;
  finalComms.forEach(c => {
    if (c.status === "DELIVERED") delivered++;
    if (c.status === "OPENED") opened++;
    if (c.status === "CLICKED") clicked++;
    if (c.status === "FAILED") failed++;
  });
  
  const total = finalComms.length;
  const sent = delivered + opened + clicked + failed;
  console.log(`Total Audiences: ${total}`);
  console.log(`Sent:      ${sent}`);
  console.log(`Delivered: ${delivered} (${((delivered/total)*100).toFixed(1)}%)`);
  console.log(`Opened:    ${opened} (${((opened/total)*100).toFixed(1)}%)`);
  console.log(`Clicked:   ${clicked} (${((clicked/total)*100).toFixed(1)}%)`);
  console.log(`Failed:    ${failed} (${((failed/total)*100).toFixed(1)}%)`);

  console.log("\nExpected Behavior met if:");
  console.log("- Delivered is 70-80%");
  console.log("- Opened is 30-50%");
  console.log("- Clicked is 10-20%");
  console.log("- Failed is 5-15%");

  process.exit(0);
}
runAudit();
