import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedDatabase } from "../services/seedService";

dotenv.config();

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI missing");

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const result = await seedDatabase(true);

  console.log("\n🎉 Seed complete!");
  console.log(`   Customers: ${result.customers}`);
  console.log(`   Orders: ${result.orders}`);
  console.log(`   Profiles: ${result.profiles}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
