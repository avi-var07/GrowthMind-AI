import { Request, Response } from "express";
import CustomerProfile from "../models/CustomerProfile";
import { getChurnSummary } from "../services/customerProfileService";

// GET /api/churn/summary - churn risk summary for dashboard
export async function getChurnSummaryHandler(req: Request, res: Response) {
  try {
    const summary = await getChurnSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch churn summary" });
  }
}

// GET /api/churn/customers - list at-risk customers with their profiles
export async function getAtRiskCustomers(req: Request, res: Response) {
  try {
    const risk = req.query.risk as string; // "high", "medium", or both
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const query: any = { churnRisk: { $in: ["high", "medium"] } };
    if (risk === "high") query.churnRisk = "high";
    if (risk === "medium") query.churnRisk = "medium";

    const [profiles, total] = await Promise.all([
      CustomerProfile.find(query)
        .populate("customerId", "name email phone city")
        .sort({ daysSinceLastOrder: -1 })
        .skip(skip)
        .limit(limit),
      CustomerProfile.countDocuments(query),
    ]);

    // Format response with churn reason explanation
    const customers = profiles.map((profile) => {
      const customer = profile.customerId as any;
      let churnReason = "";
      if (profile.churnRisk === "high") {
        churnReason = `No orders in ${profile.daysSinceLastOrder} days (> 45 day threshold)`;
      } else {
        churnReason = `No orders in ${profile.daysSinceLastOrder} days (> 30 day threshold)`;
      }

      return {
        customerId: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        totalSpend: profile.totalSpend,
        totalOrders: profile.totalOrders,
        lastOrderDate: profile.lastOrderDate,
        daysSinceLastOrder: profile.daysSinceLastOrder,
        favoriteCategory: profile.favoriteCategory,
        churnRisk: profile.churnRisk,
        churnReason, // Explains WHY this churn score was assigned
        tags: profile.tags,
      };
    });

    res.json({ customers, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch at-risk customers" });
  }
}
