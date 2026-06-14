/**
 * cleanOrphans.ts
 * Removes customerProfile documents where the referenced customer no longer exists.
 * Run once after a re-seed or manual data deletion:
 *   npm run clean-orphans
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import CustomerProfile from "../models/CustomerProfile";
import Customer from "../models/Customer";

dotenv.config();

async function cleanOrphans() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  // Find all profiles and check if their customer still exists
  const profiles = await CustomerProfile.find({}).lean();
  console.log(`Checking ${profiles.length} profiles...`);

  let removed = 0;
  for (const profile of profiles) {
    const exists = await Customer.exists({ _id: profile.customerId });
    if (!exists) {
      await CustomerProfile.deleteOne({ _id: profile._id });
      removed++;
    }
  }

  console.log(`✅ Removed ${removed} orphaned profiles.`);
  await mongoose.disconnect();
  process.exit(0);
}

cleanOrphans().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
