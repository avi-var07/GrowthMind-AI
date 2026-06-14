import mongoose from "mongoose";
import Customer from "./src/models/Customer";
import Order from "./src/models/Order";
import CustomerProfile from "./src/models/CustomerProfile";
import Campaign from "./src/models/Campaign";
import Communication from "./src/models/Communication";
import Receipt from "./src/models/Receipt";
import AttributedRevenue from "./src/models/AttributedRevenue";
import CampaignLearning from "./src/models/CampaignLearning";
import dotenv from "dotenv";

dotenv.config();

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/growthminds");
  
  console.log("--- STAGE 1: DATABASE AUDIT ---");
  console.log("Customers:", await Customer.countDocuments());
  console.log("Orders:", await Order.countDocuments());
  console.log("CustomerProfiles:", await CustomerProfile.countDocuments());
  console.log("Campaigns:", await Campaign.countDocuments());
  console.log("Communications:", await Communication.countDocuments());
  console.log("Receipts:", await Receipt.countDocuments());
  console.log("AttributedRevenue:", await AttributedRevenue.countDocuments());
  console.log("CampaignLearnings:", await CampaignLearning.countDocuments());

  const vip = await CustomerProfile.countDocuments({ tags: "VIP Customer" });
  console.log("VIP Customers:", vip);
  
  const highSpender = await CustomerProfile.countDocuments({ tags: "High Spender" });
  console.log("High Spenders:", highSpender);

  const inactive30 = await CustomerProfile.countDocuments({ daysSinceLastOrder: { $gt: 30 } });
  console.log("Inactive >30 Days:", inactive30);

  const inactive60 = await CustomerProfile.countDocuments({ daysSinceLastOrder: { $gt: 60 } });
  console.log("Inactive >60 Days:", inactive60);

  const inactive90 = await CustomerProfile.countDocuments({ daysSinceLastOrder: { $gt: 90 } });
  console.log("Inactive >90 Days:", inactive90);

  const highChurn = await CustomerProfile.countDocuments({ churnRisk: "high" });
  console.log("High Churn Count:", highChurn);

  const catDist = await CustomerProfile.aggregate([{ $group: { _id: "$favoriteCategory", count: { $sum: 1 } } }]);
  console.log("Favorite Categories:", catDist);

  const agg = await CustomerProfile.aggregate([
    { $group: { _id: null, avgSpend: { $avg: "$totalSpend" }, maxSpend: { $max: "$totalSpend" } } }
  ]);
  console.log("Spend Stats:", agg);

  await mongoose.disconnect();
}

audit().catch(console.error);
