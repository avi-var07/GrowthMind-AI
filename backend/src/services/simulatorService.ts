// Campaign Simulator - predicts campaign performance before sending
// Uses rule-based logic (no ML required)

interface SimulationInput {
  audienceSize: number;
  segmentDescription: string;
  avgOrderValue: number;
  churnRiskBreakdown: { high: number; medium: number; low: number };
  favoriteCategories: Record<string, number>;
}

interface SimulationResult {
  expectedOpenRate: number;    // percentage
  expectedClickRate: number;   // percentage
  expectedRevenue: number;     // in rupees
  confidenceScore: number;     // percentage
  breakdown: {
    estimatedDeliveries: number;
    estimatedOpens: number;
    estimatedClicks: number;
    estimatedConversions: number;
  };
}

// Rule-based simulator
// These rules are based on typical email/WhatsApp marketing benchmarks
export function simulateCampaign(input: SimulationInput): SimulationResult {
  const {
    audienceSize,
    avgOrderValue,
    churnRiskBreakdown,
    favoriteCategories,
  } = input;

  // Base rates from industry benchmarks
  let baseOpenRate = 35;
  let baseClickRate = 12;
  let confidenceScore = 70;

  // Adjust based on churn risk composition
  // High-risk customers are harder to re-engage
  const highRiskRatio = churnRiskBreakdown.high / Math.max(audienceSize, 1);
  const mediumRiskRatio = churnRiskBreakdown.medium / Math.max(audienceSize, 1);

  if (highRiskRatio > 0.5) {
    // Majority are high risk - lower open rates
    baseOpenRate -= 10;
    baseClickRate -= 4;
    confidenceScore -= 10;
  } else if (mediumRiskRatio > 0.5) {
    // Medium risk - slightly lower
    baseOpenRate -= 5;
    baseClickRate -= 2;
  }

  // Boost if targeting premium category lovers (they're more engaged)
  const premiumCount = favoriteCategories["Premium Beans"] || 0;
  const premiumRatio = premiumCount / Math.max(audienceSize, 1);
  if (premiumRatio > 0.3) {
    baseOpenRate += 8;
    baseClickRate += 4;
    confidenceScore += 5;
  }

  // Small audiences have higher confidence (more targeted)
  if (audienceSize < 50) {
    confidenceScore += 10;
    baseOpenRate += 5;
  } else if (audienceSize > 200) {
    confidenceScore -= 5;
  }

  // Clamp values to realistic ranges
  const expectedOpenRate = Math.min(Math.max(baseOpenRate, 15), 75);
  const expectedClickRate = Math.min(
    Math.max(baseClickRate, 5),
    expectedOpenRate * 0.6
  );
  const confidenceFinal = Math.min(Math.max(confidenceScore, 50), 95);

  // Calculate revenue estimate
  // Conversion rate ≈ clickRate * 0.3 (30% of clickers actually buy)
  const conversionRate = expectedClickRate * 0.3;
  const estimatedConversions = Math.floor(
    (audienceSize * conversionRate) / 100
  );
  const expectedRevenue = Math.floor(estimatedConversions * avgOrderValue);

  // Breakdown numbers
  const estimatedDeliveries = Math.floor(audienceSize * 0.9); // 90% delivery
  const estimatedOpens = Math.floor(
    (estimatedDeliveries * expectedOpenRate) / 100
  );
  const estimatedClicks = Math.floor(
    (estimatedOpens * expectedClickRate) / 100
  );

  return {
    expectedOpenRate: Math.round(expectedOpenRate),
    expectedClickRate: Math.round(expectedClickRate),
    expectedRevenue,
    confidenceScore: Math.round(confidenceFinal),
    breakdown: {
      estimatedDeliveries,
      estimatedOpens,
      estimatedClicks,
      estimatedConversions,
    },
  };
}
