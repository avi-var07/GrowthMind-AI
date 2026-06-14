import mongoose from "mongoose";
import CustomerProfile from "../models/CustomerProfile";
import Customer from "../models/Customer";

// ─── Filter → Mongo Query Builder ────────────────────────────────────────────
// Translates AI filter keys into MongoDB query conditions.
// All type coercions happen here so callers never need to think about it.
export function buildProfileQuery(filters: Record<string, any>) {
  const query: Record<string, any> = {};

  // ── Spend ──
  if (filters.minTotalSpend !== undefined) {
    query.totalSpend = {
      ...query.totalSpend,
      $gte: Number(filters.minTotalSpend),
    };
  }
  if (filters.maxTotalSpend !== undefined) {
    query.totalSpend = {
      ...query.totalSpend,
      $lte: Number(filters.maxTotalSpend),
    };
  }

  // ── Orders ──
  if (filters.minTotalOrders !== undefined) {
    query.totalOrders = {
      ...query.totalOrders,
      $gte: Number(filters.minTotalOrders),
    };
  }
  if (filters.maxTotalOrders !== undefined) {
    query.totalOrders = {
      ...query.totalOrders,
      $lte: Number(filters.maxTotalOrders),
    };
  }

  // ── Days since last order ──
  if (filters.minDaysSinceLastOrder !== undefined) {
    query.daysSinceLastOrder = {
      ...query.daysSinceLastOrder,
      $gte: Number(filters.minDaysSinceLastOrder),
    };
  }
  if (filters.maxDaysSinceLastOrder !== undefined) {
    query.daysSinceLastOrder = {
      ...query.daysSinceLastOrder,
      $lte: Number(filters.maxDaysSinceLastOrder),
    };
  }

  // ── Category — exact match, case-sensitive (matches schema enum) ──
  if (filters.favoriteCategory) {
    query.favoriteCategory = normalizeCategoryName(filters.favoriteCategory);
  }

  // ── Churn risk — lowercase ──
  if (filters.churnRisk) {
    query.churnRisk = filters.churnRisk.toLowerCase();
  }

  // ── City — case insensitive regex ──
  if (filters.city) {
    query.city = { $regex: new RegExp(`^${filters.city}$`, "i") };
  }

  // ── Tags — customer must have at least one of the requested tags ──
  if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  // ── Average order value ──
  if (filters.minAvgOrderValue !== undefined) {
    query.avgOrderValue = {
      ...query.avgOrderValue,
      $gte: Number(filters.minAvgOrderValue),
    };
  }

  return query;
}

// BUG FIX: AI sometimes returns category names with different casing or spacing.
// Normalize to the exact enum values stored in the database.
function normalizeCategoryName(raw: string): string {
  const normalized = raw.trim();
  const map: Record<string, string> = {
    espresso: "Espresso",
    latte: "Latte",
    cappuccino: "Cappuccino",
    "cold brew": "Cold Brew",
    coldbrew: "Cold Brew",
    "cold-brew": "Cold Brew",
    "premium beans": "Premium Beans",
    premiumbeans: "Premium Beans",
    "premium bean": "Premium Beans",
    premium: "Premium Beans",
  };
  return map[normalized.toLowerCase()] || normalized;
}

// ─── Audience Finder ─────────────────────────────────────────────────────────
export async function findAudience(
  filters: Record<string, any>,
  city?: string
) {
  const profileQuery = buildProfileQuery(filters);

  // BUG FIX: city is a Customer field, not a CustomerProfile field.
  // The previous implementation had no city filtering at all.
  // Fix: if city is provided, find customer IDs in that city first,
  // then restrict the profile query to those customers.
  if (city) {
    const cityCustomers = await Customer.find({
      city: { $regex: new RegExp(city, "i") }, // case-insensitive match
    })
      .select("_id")
      .lean();

    const cityCustomerIds = cityCustomers.map((c) => c._id);

    if (cityCustomerIds.length === 0) {
      return []; // No customers in that city
    }

    // BUG FIX: customerId in profiles is an ObjectId.
    // When querying with $in, ensure the IDs are ObjectIds not strings.
    profileQuery.customerId = { $in: cityCustomerIds };
  }

  const profiles = await CustomerProfile.find(profileQuery)
    .populate("customerId")
    .limit(500)
    .lean();

  // Filter out orphaned profiles (customer deleted but profile still exists)
  const audience = profiles
    .filter((profile) => profile.customerId !== null)
    .map((profile) => {
      const customer = profile.customerId as any;
      return {
        customerId: customer._id,
        name: customer.name,
        email: customer.email,
        city: customer.city,
        totalSpend: profile.totalSpend,
        totalOrders: profile.totalOrders,
        daysSinceLastOrder: profile.daysSinceLastOrder,
        favoriteCategory: profile.favoriteCategory,
        churnRisk: profile.churnRisk,
        tags: profile.tags,
      };
    });

  return audience;
}
