import mongoose from "mongoose";
import Customer from "./src/models/Customer";
import Order from "./src/models/Order";
import CustomerProfile from "./src/models/CustomerProfile";
import Campaign from "./src/models/Campaign";
import Communication from "./src/models/Communication";
import Receipt from "./src/models/Receipt";
import AttributedRevenue from "./src/models/AttributedRevenue";
import CampaignLearning from "./src/models/CampaignLearning";
import { parseSegmentPrompt } from "./src/services/geminiService";
import { buildProfileQuery } from "./src/services/segmentationService";
import dotenv from "dotenv";

dotenv.config();

async function runAudit() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/growthminds");
  
  console.log("\n==================================================");
  console.log("STEP 1 — Current Database State");
  console.log("==================================================");
  console.log("Customers Count:", await Customer.countDocuments());
  console.log("Orders Count:", await Order.countDocuments());
  console.log("CustomerProfiles Count:", await CustomerProfile.countDocuments());
  console.log("Campaigns Count:", await Campaign.countDocuments());
  console.log("Communications Count:", await Communication.countDocuments());
  console.log("Receipts Count:", await Receipt.countDocuments());
  console.log("AttributedRevenue Count:", await AttributedRevenue.countDocuments());
  console.log("CampaignLearnings Count:", await CampaignLearning.countDocuments());

  console.log("\n==================================================");
  console.log("STEP 2 — Verify Orphaned Profiles");
  console.log("==================================================");
  const allProfiles = await CustomerProfile.find({}, 'customerId').lean();
  const allCustomerIds = new Set((await Customer.find({}, '_id').lean()).map(c => c._id.toString()));
  
  let validCount = 0;
  const orphanedIds: string[] = [];
  
  allProfiles.forEach(p => {
    if (allCustomerIds.has(p.customerId.toString())) {
      validCount++;
    } else {
      orphanedIds.push(p._id.toString());
    }
  });

  console.log("Total Profiles:", allProfiles.length);
  console.log("Valid Profiles:", validCount);
  console.log("Orphaned Profiles:", orphanedIds.length);
  console.log("Sample Orphaned Profile IDs:", orphanedIds.slice(0, 5));

  console.log("\n==================================================");
  console.log("STEP 3 — Verify Persona Distribution");
  console.log("==================================================");
  console.log("VIP Customer:", await CustomerProfile.countDocuments({ tags: "VIP Customer" }));
  console.log("High Spender:", await CustomerProfile.countDocuments({ tags: "High Spender" }));
  console.log("Coffee Enthusiast:", await CustomerProfile.countDocuments({ tags: "Coffee Enthusiast" }));
  console.log("Discount Seeker:", await CustomerProfile.countDocuments({ tags: "Discount Seeker" }));
  console.log("Cold Brew Fans:", await CustomerProfile.countDocuments({ favoriteCategory: "Cold Brew" }));
  console.log("Premium Bean Buyers:", await CustomerProfile.countDocuments({ favoriteCategory: "Premium Beans" }));
  console.log("Medium Churn:", await CustomerProfile.countDocuments({ churnRisk: "medium" }));
  console.log("High Churn:", await CustomerProfile.countDocuments({ churnRisk: "high" }));
  console.log("Inactive >30 Days:", await CustomerProfile.countDocuments({ daysSinceLastOrder: { $gt: 30 } }));
  console.log("Inactive >60 Days:", await CustomerProfile.countDocuments({ daysSinceLastOrder: { $gt: 60 } }));
  console.log("Inactive >90 Days:", await CustomerProfile.countDocuments({ daysSinceLastOrder: { $gt: 90 } }));

  console.log("\n==================================================");
  console.log("STEP 4 — Verify VIP Failure");
  console.log("==================================================");
  const vipStats = await CustomerProfile.aggregate([
    { $match: { tags: "VIP Customer" } },
    { $group: { _id: null, count: { $sum: 1 }, avgSpend: { $avg: "$totalSpend" }, minSpend: { $min: "$totalSpend" }, maxSpend: { $max: "$totalSpend" } } }
  ]);
  console.log("VIP Profiles Stats:", vipStats[0] || { count: 0, avgSpend: 0, minSpend: 0, maxSpend: 0 });

  const spendGte5kNotVip = await CustomerProfile.countDocuments({ totalSpend: { $gte: 5000 }, tags: { $ne: "VIP Customer" } });
  console.log("totalSpend >= 5000 but NOT tagged VIP:", spendGte5kNotVip);

  const vipButSpendLt5k = await CustomerProfile.countDocuments({ totalSpend: { $lt: 5000 }, tags: "VIP Customer" });
  console.log("Tagged VIP but spend < 5000:", vipButSpendLt5k);

  console.log("\n==================================================");
  console.log("STEP 5 — Verify Cold Brew Churn Failure");
  console.log("==================================================");
  console.log("Total Cold Brew:", await CustomerProfile.countDocuments({ favoriteCategory: "Cold Brew" }));
  console.log("Cold Brew AND churnRisk = 'high':", await CustomerProfile.countDocuments({ favoriteCategory: "Cold Brew", churnRisk: "high" }));
  console.log("Cold Brew AND churnRisk = 'medium':", await CustomerProfile.countDocuments({ favoriteCategory: "Cold Brew", churnRisk: "medium" }));

  console.log("\n==================================================");
  console.log("STEP 6 & 7 — Segmentation Trace & Validation");
  console.log("==================================================");
  
  const prompts = [
    "Bring back inactive high-value customers",
    "Customers who spent more than ₹3000 and have not ordered in 30 days",
    "Target coffee lovers who purchased premium beans",
    "High risk churn customers who love Cold Brew",
    "VIP customers who haven't ordered in 2 months",
    "Customers from Mumbai who ordered Latte" // Note: City is in Customer, not Profile, lets see how it handles
  ];

  for (const prompt of prompts) {
    console.log(`\n[PROMPT] ${prompt}`);
    try {
      const aiResult = await parseSegmentPrompt(prompt);
      console.log("[PARSED_FILTERS]", JSON.stringify(aiResult.filters));
      
      const mongoQuery = buildProfileQuery(aiResult.filters);
      console.log("[MONGO_QUERY]", JSON.stringify(mongoQuery));
      
      const matchedProfiles = await CustomerProfile.find(mongoQuery).populate("customerId").limit(2).lean();
      const count = await CustomerProfile.countDocuments(mongoQuery);
      
      console.log("[MATCHED_CUSTOMERS_COUNT]", count);
      if (count > 0) {
        console.log("[SAMPLE_CUSTOMERS]", JSON.stringify(matchedProfiles.map((p: any) => ({
          name: p.customerId?.name,
          city: p.customerId?.city,
          spend: p.totalSpend,
          days: p.daysSinceLastOrder,
          category: p.favoriteCategory,
          churn: p.churnRisk
        }))));
      }

      if (count === 0) {
        console.log("--> ROOT CAUSE VALIDATION:");
        if (Object.keys(aiResult.filters).length === 0) {
           console.log("    A. AI misunderstood prompt / B. JSON extraction failed (Filters are empty)");
        } else if (Object.keys(mongoQuery).length === 0) {
           console.log("    C. Filter mapping failed (Mongo query is empty)");
        } else {
           console.log("    E. Matching data does not exist (Query is valid but no DB records match)");
        }
      }
    } catch (e: any) {
      console.log("[ERROR]", e.message);
    }
  }

  await mongoose.disconnect();
}

runAudit().catch(console.error);
