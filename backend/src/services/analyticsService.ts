import Campaign from "../models/Campaign";
import Communication from "../models/Communication";
import AttributedRevenue from "../models/AttributedRevenue";

// Get performance stats for a single campaign
export async function getCampaignStats(campaignId: string) {
  const comms = await Communication.find({ campaignId });

  const total = comms.length;
  const pending = comms.filter((c) => c.status === "PENDING").length;
  const failed = comms.filter((c) => c.status === "FAILED").length;
  const clicked = comms.filter((c) => c.status === "CLICKED").length;

  // OPENED means status is OPENED or CLICKED (clicked implies opened)
  const opened = comms.filter(
    (c) => c.status === "OPENED" || c.status === "CLICKED"
  ).length;

  // BUG FIX: delivered = explicitly DELIVERED + OPENED + CLICKED
  // Previously counted everything != FAILED, which included PENDING.
  // PENDING messages have NOT been delivered yet — they must be excluded.
  const delivered = comms.filter(
    (c) =>
      c.status === "DELIVERED" ||
      c.status === "OPENED" ||
      c.status === "CLICKED"
  ).length;

  // Rates are calculated against the correct denominators
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
  const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;

  // Get attributed revenue for this campaign
  const revenueRecords = await AttributedRevenue.find({ campaignId });
  const totalRevenue = revenueRecords.reduce((sum, r) => sum + r.revenue, 0);

  return {
    total,
    pending,
    delivered,
    opened,
    clicked,
    failed,
    deliveryRate,
    openRate,
    clickRate,
    attributedRevenue: totalRevenue,
  };
}

// Get overall analytics across all campaigns
// BUG FIX: query both "sent" AND "completed" — previously "completed" campaigns
// were invisible to analytics because only status:"sent" was queried.
export async function getOverallAnalytics() {
  const campaigns = await Campaign.find({
    status: { $in: ["sent", "completed"] },
  }).lean();

  if (campaigns.length === 0) {
    return {
      totalCampaigns: 0,
      totalAudienceReached: 0,
      avgDeliveryRate: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      totalRevenue: 0,
      campaignPerformance: [],
      topRevenueCampaigns: [],
    };
  }

  // BUG FIX: Batch all communications in one query instead of N+1 loop.
  // Previous code called getCampaignStats() per campaign inside a loop —
  // 100 campaigns = 100 separate DB queries.
  const campaignIds = campaigns.map((c) => c._id);

  const [allComms, allRevenue] = await Promise.all([
    Communication.find({ campaignId: { $in: campaignIds } }).lean(),
    AttributedRevenue.find({ campaignId: { $in: campaignIds } }).lean(),
  ]);

  // Group by campaignId for O(1) lookup
  const commsByCampaign: Record<string, typeof allComms> = {};
  for (const comm of allComms) {
    const key = comm.campaignId.toString();
    if (!commsByCampaign[key]) commsByCampaign[key] = [];
    commsByCampaign[key].push(comm);
  }

  const revenueByCampaign: Record<string, number> = {};
  for (const rev of allRevenue) {
    const key = rev.campaignId.toString();
    revenueByCampaign[key] = (revenueByCampaign[key] || 0) + rev.revenue;
  }

  const performanceData = campaigns.map((campaign) => {
    const id = campaign._id.toString();
    const comms = commsByCampaign[id] || [];
    const total = comms.length;
    const pending = comms.filter((c) => c.status === "PENDING").length;
    const failed = comms.filter((c) => c.status === "FAILED").length;
    const clicked = comms.filter((c) => c.status === "CLICKED").length;
    const opened = comms.filter(
      (c) => c.status === "OPENED" || c.status === "CLICKED"
    ).length;
    const delivered = comms.filter(
      (c) =>
        c.status === "DELIVERED" ||
        c.status === "OPENED" ||
        c.status === "CLICKED"
    ).length;

    const deliveryRate =
      total > 0 ? Math.round((delivered / total) * 100) : 0;
    const openRate =
      delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
    const clickRate =
      opened > 0 ? Math.round((clicked / opened) * 100) : 0;
    const attributedRevenue = revenueByCampaign[id] || 0;

    return {
      campaignId: campaign._id,
      name: campaign.name,
      audienceSize: campaign.audienceSize,
      total,
      pending,
      delivered,
      opened,
      clicked,
      failed,
      deliveryRate,
      openRate,
      clickRate,
      attributedRevenue,
    };
  });

  const count = campaigns.length;
  const totalDeliveryRate = performanceData.reduce(
    (s, c) => s + c.deliveryRate,
    0
  );
  const totalOpenRate = performanceData.reduce((s, c) => s + c.openRate, 0);
  const totalClickRate = performanceData.reduce((s, c) => s + c.clickRate, 0);
  const totalRevenue = performanceData.reduce(
    (s, c) => s + c.attributedRevenue,
    0
  );

  const sorted = [...performanceData].sort(
    (a, b) => b.attributedRevenue - a.attributedRevenue
  );

  return {
    totalCampaigns: count,
    totalAudienceReached: campaigns.reduce((s, c) => s + c.audienceSize, 0),
    avgDeliveryRate: Math.round(totalDeliveryRate / count),
    avgOpenRate: Math.round(totalOpenRate / count),
    avgClickRate: Math.round(totalClickRate / count),
    totalRevenue,
    campaignPerformance: sorted,
    topRevenueCampaigns: sorted.slice(0, 3),
  };
}
