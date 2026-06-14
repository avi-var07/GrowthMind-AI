import { Request, Response } from "express";
import { parseSegmentPrompt } from "../services/geminiService";
import { findAudience } from "../services/segmentationService";

// POST /api/segment/chat
// Accepts a plain-English prompt, converts to filters via AI,
// then queries the database for matching customers.
export async function chatSegment(req: Request, res: Response) {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const cleanPrompt = prompt.trim();

    // AI converts natural language → structured filters + explanation
    const { filters, explanation } = await parseSegmentPrompt(cleanPrompt);

    // BUG FIX: city is extracted from filters and passed separately to findAudience
    // because city lives on the Customer document, not CustomerProfile.
    // The segmentationService now handles the two-step lookup.
    const city: string | undefined = filters.city || filters.customerCity;
    const profileFilters = { ...filters };
    delete profileFilters.city;
    delete profileFilters.customerCity;

    // Find matching audience
    const audience = await findAudience(profileFilters, city);

    // Churn breakdown for the found audience
    const churnBreakdown = {
      high: audience.filter((a) => a.churnRisk === "high").length,
      medium: audience.filter((a) => a.churnRisk === "medium").length,
      low: audience.filter((a) => a.churnRisk === "low").length,
    };

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    audience.forEach((a) => {
      categoryBreakdown[a.favoriteCategory] =
        (categoryBreakdown[a.favoriteCategory] || 0) + 1;
    });

    // Log for debugging — always visible in backend terminal
    console.log(
      `[Segment] Prompt: "${cleanPrompt}"\n` +
      `          Filters: ${JSON.stringify(profileFilters)}\n` +
      `          City filter: ${city || "none"}\n` +
      `          Audience: ${audience.length} customers`
    );

    res.json({
      prompt: cleanPrompt,
      filters: profileFilters,
      city: city || null,
      explanation,
      audienceCount: audience.length,
      audiencePreview: audience.slice(0, 10),
      allAudienceIds: audience.map((a) => a.customerId),
      churnBreakdown,
      categoryBreakdown,
    });
  } catch (error: any) {
    console.error("Segmentation error:", error);
    res.status(500).json({
      error: "Failed to process segmentation request",
      detail: error.message,
    });
  }
}
