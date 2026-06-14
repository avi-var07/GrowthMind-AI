import mongoose from "mongoose";
import CustomerProfile from "./src/models/CustomerProfile";

mongoose.connect("mongodb://localhost:27017/growthminds").then(async () => {
  const c = await CustomerProfile.countDocuments({ totalSpend: { $gte: 5000 }, daysSinceLastOrder: { $gte: 30 } });
  console.log("Count:", c);
  process.exit(0);
});
