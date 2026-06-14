import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/growthminds";

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected:", mongoUri);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}
