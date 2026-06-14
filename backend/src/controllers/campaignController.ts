import { Request, Response } from "express";
import mongoose from "mongoose";
import Campaign from "../models/Campaign";
import Communication from "../models/Communication";
import CustomerProfile from "../models/CustomerProfile";
import Customer from "../models/Customer";
import { simulateCampaign } from "../services/simulatorService";
import {
  generateCampaignMessages,
  generateSimulatorExplanation,
} from "../services/geminiService";
import { sendToChannelService } from "../services/channelService";
import { getCampaignStats } from "../services/analyticsService";

// POST /api/campaigns/simulate - simulate a campaign before sending
export async function simulateCampaignHandler(req: Request, res: Response) {
  try {
    const { audienceIds, segmentDescription } = req.body;

    if (!audienceIds || audienceIds.length === 0) {
      return res.status(400).json({ error: "No audience provided" });
    }

    // BUG FIX: audienceIds arrive as strings from the request body.
    // Mongoose's $in with ObjectId fields requires actual ObjectId instances,
    // otherwise the query silently returns 0 results.
    const audienceObjectIds = audienceIds.map(
      (id: string) => new mongoose.Types.ObjectId(id)
    );

    // Get profiles for the audience
    const profiles = await CustomerProfile.find({
      customerId: { $in: audienceObjectIds },
    }).lean();

    // Calculate aggregate stats
    const avgOrderValue =
      profiles.reduce((sum, p) => sum + p.avgOrderValue, 0) /
      Math.max(profiles.length, 1);

    const churnRiskBreakdown = {
      high: profiles.filter((p) => p.churnRisk === "high").length,
      medium: profiles.filter((p) => p.churnRisk === "medium").length,
      low: profiles.filter((p) => p.churnRisk === "low").length,
    };

    const favoriteCategories: Record<string, number> = {};
    profiles.forEach((p) => {
      favoriteCategories[p.favoriteCategory] =
        (favoriteCategories[p.favoriteCategory] || 0) + 1;
    });

    // Run simulation
    const simulation = simulateCampaign({
      audienceSize: audienceIds.length,
      segmentDescription: segmentDescription || "",
      avgOrderValue,
      churnRiskBreakdown,
      favoriteCategories,
    });

    // Ask Gemini to explain the simulation results
    const aiExplanation = await generateSimulatorExplanation({
      audienceSize: audienceIds.length,
      segmentDescription: segmentDescription || "",
      ...simulation,
    });

    res.json({ ...simulation, aiExplanation });
  } catch (error) {
    console.error("Simulation error:", error);
    res.status(500).json({ error: "Simulation failed" });
  }
}

// POST /api/campaigns/generate-messages - generate personalized messages
export async function generateMessages(req: Request, res: Response) {
  try {
    const { audienceIds, campaignGoal } = req.body;

    if (!audienceIds || audienceIds.length === 0) {
      return res.status(400).json({ error: "No audience provided" });
    }

    // BUG FIX: coerce string IDs to ObjectIds
    const audienceObjectIds = audienceIds.map(
      (id: string) => new mongoose.Types.ObjectId(id)
    );

    // Generate a sample message based on first customer's profile
    const sampleProfile = await CustomerProfile.findOne({
      customerId: { $in: audienceObjectIds },
    }).populate("customerId");

    if (!sampleProfile) {
      return res.status(404).json({ error: "No customer profiles found" });
    }

    const customer = sampleProfile.customerId as any;

    const messages = await generateCampaignMessages({
      customerName: customer.name,
      favoriteCategory: sampleProfile.favoriteCategory,
      daysSinceLastOrder: sampleProfile.daysSinceLastOrder,
      totalSpend: sampleProfile.totalSpend,
      campaignGoal: campaignGoal || "win back inactive customers",
    });

    res.json({
      whatsappMessage: messages.whatsapp,
      emailMessage: messages.email,
      sampleCustomer: {
        name: customer.name,
        favoriteCategory: sampleProfile.favoriteCategory,
        daysSinceLastOrder: sampleProfile.daysSinceLastOrder,
      },
    });
  } catch (error) {
    console.error("Message generation error:", error);
    res.status(500).json({ error: "Failed to generate messages" });
  }
}

// POST /api/campaigns/send - create and send a campaign
export async function sendCampaign(req: Request, res: Response) {
  try {
    const {
      name,
      segmentDescription,
      audienceIds,
      whatsappMessage,
      emailMessage,
      predictedRevenue,
      predictedOpenRate,
      predictedClickRate,
      confidenceScore,
    } = req.body;

    if (!name || !audienceIds || audienceIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Campaign name and audience are required" });
    }

    // Create the campaign record
    const campaign = await Campaign.create({
      name,
      segmentDescription: segmentDescription || "",
      audienceSize: audienceIds.length,
      audienceIds,
      predictedRevenue: predictedRevenue || 0,
      predictedOpenRate: predictedOpenRate || 0,
      predictedClickRate: predictedClickRate || 0,
      confidenceScore: confidenceScore || 0,
      whatsappMessage,
      emailMessage,
      status: "sent",
      sentAt: new Date(),
    });

    // Prevent silent failures: Check if Channel Service is actually available
    const { checkChannelServiceHealth } = require("../services/channelService");
    const isChannelServiceOnline = await checkChannelServiceHealth();
    
    if (!isChannelServiceOnline) {
      // Revert campaign to draft so user can try again
      await Campaign.findByIdAndUpdate(campaign._id, { status: "draft", sentAt: null });
      return res.status(503).json({ error: "Channel Service is currently unavailable. Campaign saved as draft." });
    }

    // Create communication logs for each customer
    // Alternate between whatsapp and email channels
    const communications = [];
    for (let i = 0; i < audienceIds.length; i++) {
      const channel = i % 2 === 0 ? "whatsapp" : "email";
      const message =
        channel === "whatsapp" ? whatsappMessage : emailMessage;

      communications.push({
        campaignId: campaign._id,
        customerId: audienceIds[i],
        channel,
        message,
        status: "PENDING",
      });
    }

    const savedComms = await Communication.insertMany(communications);

    // Send each communication via Channel Service asynchronously
    const callbackUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/receipt`;

    // Fire and forget - don't wait for all sends
    savedComms.forEach((comm) => {
      sendToChannelService({
        communicationId: comm._id.toString(),
        campaignId: campaign._id.toString(),
        customerId: comm.customerId.toString(),
        channel: comm.channel as "whatsapp" | "email",
        message: comm.message,
        callbackUrl,
      }).catch((err) => {
        console.error(`Failed to send comm ${comm._id}:`, err);
      });
    });

    res.json({
      message: "Campaign sent successfully",
      campaignId: campaign._id,
      audienceSize: audienceIds.length,
    });
  } catch (error) {
    console.error("Send campaign error:", error);
    res.status(500).json({ error: "Failed to send campaign" });
  }
}

// GET /api/campaigns - list all campaigns
export async function getCampaigns(req: Request, res: Response) {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
}

// GET /api/campaigns/:id - get campaign details with stats
export async function getCampaignById(req: Request, res: Response) {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const stats = await getCampaignStats(req.params.id);

    res.json({ campaign, stats });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
}

// GET /api/campaigns/:id/communications - get communication logs for a campaign
export async function getCampaignCommunications(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [comms, total] = await Promise.all([
      Communication.find({ campaignId: req.params.id })
        .populate("customerId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Communication.countDocuments({ campaignId: req.params.id }),
    ]);

    res.json({ communications: comms, total, page });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch communications" });
  }
}
