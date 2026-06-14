import { Router, Request, Response } from "express";
import { buildAllProfiles } from "../services/customerProfileService";
import Customer from "../models/Customer";
import CustomerProfile from "../models/CustomerProfile";

const router = Router();

// POST /api/admin/rebuild-profiles
// Rebuilds all customerProfiles from existing customers + orders.
// Use this if profiles look stale or after a manual data import.
router.post("/rebuild-profiles", async (req: Request, res: Response) => {
  try {
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      return res.status(400).json({
        error: "No customers found. Run the seed script first.",
      });
    }

    // Run in background — respond immediately so request doesn't time out
    res.json({
      message: `Rebuilding profiles for ${customerCount} customers. This runs in the background.`,
      customerCount,
    });

    // Build profiles after responding
    await buildAllProfiles();
    console.log(`[Admin] Profile rebuild complete for ${customerCount} customers.`);
  } catch (error) {
    console.error("[Admin] Rebuild profiles error:", error);
  }
});

// GET /api/admin/stats — quick database health check
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const [customers, profiles] = await Promise.all([
      Customer.countDocuments(),
      CustomerProfile.countDocuments(),
    ]);

    const churnBreakdown = await CustomerProfile.aggregate([
      { $group: { _id: "$churnRisk", count: { $sum: 1 } } },
    ]);

    res.json({
      customers,
      profiles,
      profilesBuilt: profiles > 0,
      churnBreakdown: churnBreakdown.reduce((acc: any, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
