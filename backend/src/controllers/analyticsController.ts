import { Request, Response } from "express";
import { getOverallAnalytics } from "../services/analyticsService";
import { generateInsights, generateRecommendations } from "../services/geminiService";
import AttributedRevenue from "../models/AttributedRevenue";
import Campaign from "../models/Campaign";
import CampaignLearning from "../models/CampaignLearning";
import { getCampaignStats } from "../services/analyticsService";

// GET /api/analytics - overall analytics dashboard data
export async function getAnalytics(req: Request, res: Response) {
  try {
    const data = await getOverallAnalytics();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}

// GET /api/analytics/revenue - revenue attribution data
export async function getRevenueAttribution(req: Request, res: Response) {
  try {
    // Total attributed revenue
    const revenueBysCampaign = await AttributedRevenue.aggregate([
      {
        $group: {
          _id: "$campaignId",
          totalRevenue: { $sum: "$revenue" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // Add campaign names
    const enriched = await Promise.all(
      revenueBysCampaign.map(async (item) => {
        const campaign = await Campaign.findById(item._id).select("name");
        return {
          campaignId: item._id,
          campaignName: campaign?.name || "Unknown",
          totalRevenue: item.totalRevenue,
          orderCount: item.orderCount,
        };
      })
    );

    const totalRevenue = enriched.reduce((sum, c) => sum + c.totalRevenue, 0);

    res.json({
      totalRevenue,
      revenueByCampaign: enriched,
      topCampaigns: enriched.slice(0, 5),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch revenue attribution" });
  }
}

// GET /api/analytics/insights - AI-generated insights
export async function getAIInsights(req: Request, res: Response) {
  try {
    const analyticsData = await getOverallAnalytics();

    if (analyticsData.totalCampaigns === 0) {
      return res.json({
        insights: [
          "No campaigns have been sent yet. Start by segmenting your audience in the Chat tab.",
          "Use the Churn dashboard to identify customers at risk of leaving.",
          "Premium Beans buyers tend to be your most engaged customers.",
        ],
      });
    }

    const revenueData = await AttributedRevenue.aggregate([
      { $group: { _id: null, total: { $sum: "$revenue" }, count: { $sum: 1 } } },
    ]);

    const insights = await generateInsights({
      campaigns: analyticsData.campaignPerformance,
      revenueData: revenueData[0] || { total: 0, count: 0 },
      topPerformers: analyticsData.topRevenueCampaigns || [],
    });

    res.json({ insights });
  } catch (error) {
    console.error("Insights error:", error);
    res.status(500).json({ error: "Failed to generate insights" });
  }
}

// POST /api/analytics/save-learning - save campaign learnings after completion
// Called after a campaign has enough data
export async function saveCampaignLearning(req: Request, res: Response) {
  try {
    const { campaignId } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const stats = await getCampaignStats(campaignId);

    // Check if learning already exists
    const existing = await CampaignLearning.findOne({ campaignId });
    if (existing) {
      await CampaignLearning.findOneAndUpdate(
        { campaignId },
        {
          openRate: stats.openRate,
          clickRate: stats.clickRate,
          deliveryRate: stats.deliveryRate,
          revenue: stats.attributedRevenue,
          bestChannel: stats.clicked > 0 ? "whatsapp" : "email",
        }
      );
    } else {
      await CampaignLearning.create({
        campaignId,
        campaignName: campaign.name,
        segmentDescription: campaign.segmentDescription,
        audienceSize: campaign.audienceSize,
        openRate: stats.openRate,
        clickRate: stats.clickRate,
        deliveryRate: stats.deliveryRate,
        revenue: stats.attributedRevenue,
        bestChannel: stats.clicked > 0 ? "whatsapp" : "email",
      });
    }

    res.json({ message: "Learning saved" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save learning" });
  }
}

// GET /api/analytics/recommendations - AI recommendations using marketing memory
export async function getRecommendations(req: Request, res: Response) {
  try {
    const { goal } = req.query;

    // Read marketing memory
    const learnings = await CampaignLearning.find()
      .sort({ revenue: -1 })
      .limit(10)
      .lean();

    if (learnings.length === 0) {
      return res.json({
        recommendation:
          "No historical data available yet. Run a few campaigns first to build Marketing Memory.",
        learnings: [],
      });
    }

    const recommendation = await generateRecommendations(
      learnings,
      (goal as string) || "maximize revenue"
    );

    res.json({ recommendation, learnings });
  } catch (error) {
    res.status(500).json({ error: "Failed to get recommendations" });
  }
}
