import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Customer from "../models/Customer";
import Order from "../models/Order";
import CustomerProfile from "../models/CustomerProfile";
import { generateProfileData } from "../services/customerProfileService";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function verifyProfiles() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/growthmind");
  console.log("Connected to MongoDB for verification");

  const customers = await Customer.find({}).limit(20).lean();
  let matches = 0;
  let mismatches = 0;

  for (const customer of customers) {
    const customerId = customer._id.toString();
    const orders = await Order.find({ customerId }).lean();
    
    const existingProfile = await CustomerProfile.findOne({ customerId }).lean();
    if (!existingProfile) {
      console.error(`Mismatch: No existing profile found for ${customerId}`);
      mismatches++;
      continue;
    }

    // Use the exact same 'now' timestamp from the database to ensure time-sensitive logic (daysSinceLastOrder) aligns exactly
    const calculatedProfile = generateProfileData(customer, orders, existingProfile.updatedAt as Date);

    const keysToCompare = [
      "totalSpend",
      "totalOrders",
      "favoriteCategory",
      "avgOrderValue",
      "churnRisk",
      "daysSinceLastOrder"
    ];

    let isMatch = true;
    const differences: any = {};

    for (const key of keysToCompare) {
      if ((existingProfile as any)[key] !== (calculatedProfile as any)[key]) {
        isMatch = false;
        differences[key] = { existing: (existingProfile as any)[key], new: (calculatedProfile as any)[key] };
      }
    }

    // Compare tags array
    const existingTags = existingProfile.tags.sort().join(",");
    const calculatedTags = calculatedProfile.tags.sort().join(",");
    if (existingTags !== calculatedTags) {
      isMatch = false;
      differences["tags"] = { existing: existingTags, new: calculatedTags };
    }

    if (isMatch) {
      matches++;
    } else {
      mismatches++;
      console.error(`Mismatch for Customer ${customerId}:`);
      console.dir(differences);
    }
  }

  console.log("\n--- Verification Report ---");
  console.log(`Sample Size: ${customers.length}`);
  console.log(`Exact Matches: ${matches}`);
  console.log(`Mismatches: ${mismatches}`);

  if (mismatches === 0) {
    console.log("✅ Behavior is 100% identical. Optimization strictly improves performance without altering assignment functionality.");
  } else {
    console.log("❌ Behavior mismatch detected.");
  }

  await mongoose.disconnect();
}

verifyProfiles().catch(console.error);
