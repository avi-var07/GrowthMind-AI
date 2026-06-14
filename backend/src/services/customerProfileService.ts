import Customer from "../models/Customer";
import Order from "../models/Order";
import CustomerProfile from "../models/CustomerProfile";

// Rebuild all customer profiles from scratch
// Called after new data is uploaded or on demand
export async function buildAllProfiles(): Promise<number> {
  const customers = await Customer.find({});
  console.log(`Building profiles for ${customers.length} customers...`);

  for (const customer of customers) {
    await buildProfileForCustomer(customer._id.toString());
  }

  // Cleanup orphaned profiles
  const activeCustomerIds = customers.map(c => c._id.toString());
  const cleanupResult = await CustomerProfile.deleteMany({
    customerId: { $nin: activeCustomerIds }
  });
  console.log(`Cleaned up ${cleanupResult.deletedCount} orphaned profiles.`);

  console.log("All profiles built.");
  return customers.length;
}

// Build or update a single customer's profile
export async function buildProfileForCustomer(
  customerId: string
): Promise<void> {
  const customer = await Customer.findById(customerId);
  if (!customer) return; // Customer doesn't exist

  const orders = await Order.find({ customerId });

  if (orders.length === 0) {
    // Customer has no orders — mark as high churn risk with no favorite category.
    // BUG FIX: Do NOT store "None" as favoriteCategory — it is not a valid enum
    // value and breaks category-based segmentation filters.
    // Store empty string instead; the UI handles display of "—".
    await CustomerProfile.findOneAndUpdate(
      { customerId },
      {
        customerId,
        totalSpend: 0,
        totalOrders: 0,
        lastOrderDate: null,
        favoriteCategory: "",
        avgOrderValue: 0,
        tags: ["Inactive Customer"],
        churnRisk: "high",
        daysSinceLastOrder: 999,
        city: customer.city,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    return;
  }

  // Calculate basic metrics
  const totalSpend = orders.reduce((sum, o) => sum + o.amount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalSpend / totalOrders;

  // Find the most recent order date
  const sortedOrders = orders.sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
  const lastOrderDate = sortedOrders[0].orderDate;

  // Days since last order
  const now = new Date();
  const daysSinceLastOrder = Math.floor(
    (now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Find favorite category (most ordered)
  const categoryCounts: Record<string, number> = {};
  for (const order of orders) {
    categoryCounts[order.category] = (categoryCounts[order.category] || 0) + 1;
  }
  const favoriteCategory = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  // Churn risk based on days since last order
  let churnRisk: "high" | "medium" | "low" = "low";
  if (daysSinceLastOrder > 45) churnRisk = "high";
  else if (daysSinceLastOrder > 30) churnRisk = "medium";

  // Generate profile tags based on behavior
  const tags: string[] = [];

  if (totalSpend > 5000) tags.push("VIP Customer");
  if (totalSpend > 3000 && totalSpend <= 5000) tags.push("High Spender");
  if (daysSinceLastOrder > 45) tags.push("Inactive Customer");
  if (favoriteCategory === "Premium Beans") tags.push("Coffee Enthusiast");
  if (avgOrderValue < 200) tags.push("Discount Seeker");
  if (totalOrders >= 10) tags.push("Loyal Customer");
  if (favoriteCategory === "Cold Brew") tags.push("Cold Brew Fan");
  if (totalOrders === 1) tags.push("One-Time Buyer");

  // Default tag if none assigned
  if (tags.length === 0) tags.push("Regular Customer");

  await CustomerProfile.findOneAndUpdate(
    { customerId },
    {
      customerId,
      totalSpend,
      totalOrders,
      lastOrderDate,
      favoriteCategory,
      avgOrderValue,
      tags,
      churnRisk,
      daysSinceLastOrder,
      city: customer.city,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

// Get churn summary stats
export async function getChurnSummary() {
  const total = await CustomerProfile.countDocuments({
    churnRisk: { $in: ["high", "medium"] },
  });
  const high = await CustomerProfile.countDocuments({ churnRisk: "high" });
  const medium = await CustomerProfile.countDocuments({ churnRisk: "medium" });

  return { total, high, medium };
}
