import mongoose from "mongoose";
import dotenv from "dotenv";
import CustomerProfile from "./src/models/CustomerProfile";
import Customer from "./src/models/Customer";
import Order from "./src/models/Order";
import Campaign from "./src/models/Campaign";
import Communication from "./src/models/Communication";
import AttributedRevenue from "./src/models/AttributedRevenue";
import CampaignLearning from "./src/models/CampaignLearning";
import { parseSegmentPrompt, generateInsights } from "./src/services/geminiService";
import { buildProfileQuery } from "./src/services/segmentationService";
import { simulateCampaign } from "./src/services/simulatorService";
import { getCampaignStats, getOverallAnalytics } from "./src/services/analyticsService";

dotenv.config();

async function runEndToEnd() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/growthminds");

  console.log("\n==================================================");
  console.log("STAGE 1: Customer Data & Segmentation");
  console.log("==================================================");
  const prompt = "High risk churn customers who love Cold Brew";
  const aiResult = await parseSegmentPrompt(prompt);
  console.log("Parsed Filters:", aiResult.filters);
  const mongoQuery = buildProfileQuery(aiResult.filters);
  const matchedProfiles = await CustomerProfile.find(mongoQuery).populate("customerId").lean();
  console.log(`Found ${matchedProfiles.length} matching customers.`);
  
  if (matchedProfiles.length === 0) {
    console.log("Aborting: No customers found.");
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("STAGE 2: Campaign Simulation");
  console.log("==================================================");
  let totalSpend = 0;
  let churnBreakdown = { high: 0, medium: 0, low: 0 };
  let cats: Record<string, number> = {};

  matchedProfiles.forEach((p: any) => {
    totalSpend += p.avgOrderValue;
    churnBreakdown[p.churnRisk as keyof typeof churnBreakdown]++;
    cats[p.favoriteCategory] = (cats[p.favoriteCategory] || 0) + 1;
  });

  const simResult = simulateCampaign({
    audienceSize: matchedProfiles.length,
    segmentDescription: prompt,
    avgOrderValue: totalSpend / matchedProfiles.length,
    churnRiskBreakdown: churnBreakdown,
    favoriteCategories: cats,
  });
  console.log("Simulation Result:", JSON.stringify(simResult, null, 2));

  console.log("\n==================================================");
  console.log("STAGE 3 & 4: Campaign Creation & Send");
  console.log("==================================================");
  const campaign = await Campaign.create({
    name: "Winback Cold Brew Lovers",
    segmentDescription: prompt,
    audienceSize: matchedProfiles.length,
    predictedRevenue: simResult.expectedRevenue,
    predictedOpenRate: simResult.expectedOpenRate,
    predictedClickRate: simResult.expectedClickRate,
    status: "sent",
    whatsappMessage: "Hey {{name}}, we miss you! Enjoy 20% off your next Cold Brew.",
    emailMessage: "Hey {{name}}, we miss you! Enjoy 20% off your next Cold Brew.",
  });
  console.log(`Created Campaign ID: ${campaign._id}`);

  const commsToInsert = matchedProfiles.map((p: any) => ({
    campaignId: campaign._id,
    customerId: p.customerId._id,
    channel: "email",
    message: `Hey ${p.customerId.name}, we miss you! Enjoy 20% off your next Cold Brew.`,
    status: "PENDING",
  }));
  const comms = await Communication.insertMany(commsToInsert);
  console.log(`Created ${comms.length} pending communications.`);

  console.log("\n==================================================");
  console.log("STAGE 5: Channel Service & Callback");
  console.log("==================================================");
  console.log("Simulating callbacks...");
  
  // Simulate 90% Delivered, 50% Opened, 20% Clicked
  let deliveredCount = 0, openedCount = 0, clickedCount = 0, failedCount = 0;
  
  for (const comm of comms) {
    let finalStatus = "PENDING";
    const rand = Math.random();
    if (rand < 0.1) { finalStatus = "FAILED"; failedCount++; }
    else if (rand < 0.55) { finalStatus = "DELIVERED"; deliveredCount++; }
    else if (rand < 0.9) { finalStatus = "OPENED"; openedCount++; }
    else { finalStatus = "CLICKED"; clickedCount++; }

    await Communication.findByIdAndUpdate(comm._id, { status: finalStatus, updatedAt: new Date() });
    
    // Simulate Revenue Attribution for clicked users
    if (finalStatus === "CLICKED") {
      // Create a fake new order for them placed right now
      const order = await Order.create({
        customerId: comm.customerId,
        amount: Math.floor(Math.random() * 500) + 300,
        category: "Cold Brew",
        orderDate: new Date(),
      });
      await AttributedRevenue.create({
        campaignId: campaign._id,
        customerId: comm.customerId,
        orderId: order._id,
        revenue: order.amount,
      });
    }
  }
  console.log(`Updated Statuses: Failed=${failedCount}, Delivered=${deliveredCount}, Opened=${openedCount}, Clicked=${clickedCount}`);

  console.log("\n==================================================");
  console.log("STAGE 6: Analytics & Revenue Attribution");
  console.log("==================================================");
  const stats = await getCampaignStats(campaign._id.toString());
  console.log("Campaign Stats:", JSON.stringify(stats, null, 2));

  console.log("\n==================================================");
  console.log("STAGE 7: AI Insights");
  console.log("==================================================");
  const overall = await getOverallAnalytics();
  try {
    const revenueData = await AttributedRevenue.aggregate([
      { $group: { _id: null, total: { $sum: "$revenue" }, count: { $sum: 1 } } },
    ]);
    const insights = await generateInsights({
      campaigns: overall.campaignPerformance,
      revenueData: revenueData[0] || { total: 0, count: 0 },
      topPerformers: overall.topRevenueCampaigns || [],
    });
    console.log("Generated AI Insights:", JSON.stringify(insights, null, 2));
  } catch (e: any) {
    console.log("Insights generation failed (Using fallback?):", e.message);
  }

  console.log("\n==================================================");
  console.log("STAGE 8: Marketing Memory");
  console.log("==================================================");
  const learning = await CampaignLearning.create({
    campaignId: campaign._id,
    campaignName: campaign.name,
    segment: prompt,
    audienceSize: campaign.audienceSize,
    deliveryRate: stats.deliveryRate,
    openRate: stats.openRate,
    clickRate: stats.clickRate,
    revenue: stats.attributedRevenue,
    keyTakeaway: "Cold brew lovers respond extremely well to win-back discounts.",
  });
  console.log("Saved Campaign Learning:", JSON.stringify(learning, null, 2));

  await mongoose.disconnect();
}

runEndToEnd().catch(console.error);
