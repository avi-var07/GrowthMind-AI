import Customer from "../models/Customer";
import Order from "../models/Order";
import CustomerProfile from "../models/CustomerProfile";

// Rebuild all customer profiles from scratch
// Called after new data is uploaded or on demand
// Shared pure logic for generating profile metrics to ensure 100% consistency
export function generateProfileData(customer: any, orders: any[], now: Date = new Date()) {
  const customerId = customer._id.toString();

  if (orders.length === 0) {
    return {
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
      updatedAt: now,
    };
  }

  const totalSpend = orders.reduce((sum, o) => sum + o.amount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalSpend / totalOrders;

  let lastOrderDate = orders[0].orderDate;
  for (const o of orders) {
    if (new Date(o.orderDate).getTime() > new Date(lastOrderDate).getTime()) {
      lastOrderDate = o.orderDate;
    }
  }

  const daysSinceLastOrder = Math.floor(
    (now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const categoryCounts: Record<string, number> = {};
  for (const order of orders) {
    categoryCounts[order.category] = (categoryCounts[order.category] || 0) + 1;
  }
  const favoriteCategory = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  let churnRisk: "high" | "medium" | "low" = "low";
  if (daysSinceLastOrder > 45) churnRisk = "high";
  else if (daysSinceLastOrder > 30) churnRisk = "medium";

  const tags: string[] = [];

  if (totalSpend > 5000) tags.push("VIP Customer");
  if (totalSpend > 3000 && totalSpend <= 5000) tags.push("High Spender");
  if (daysSinceLastOrder > 45) tags.push("Inactive Customer");
  if (favoriteCategory === "Premium Beans") tags.push("Coffee Enthusiast");
  if (avgOrderValue < 200) tags.push("Discount Seeker");
  if (totalOrders >= 10) tags.push("Loyal Customer");
  if (favoriteCategory === "Cold Brew") tags.push("Cold Brew Fan");
  if (totalOrders === 1) tags.push("One-Time Buyer");

  if (tags.length === 0) tags.push("Regular Customer");

  return {
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
    updatedAt: now,
  };
}

export async function buildAllProfiles(): Promise<number> {
  const customers = await Customer.find({}).lean();
  console.log(`Building profiles for ${customers.length} customers...`);

  const customerIds = customers.map(c => c._id);
  
  // Fetch all orders at once to avoid N+1 query problem
  const allOrders = await Order.find({ customerId: { $in: customerIds } }).lean();
  
  const ordersByCustomer: Record<string, any[]> = {};
  for (const order of allOrders) {
    const cid = order.customerId.toString();
    if (!ordersByCustomer[cid]) ordersByCustomer[cid] = [];
    ordersByCustomer[cid].push(order);
  }

  const bulkOps: any[] = [];
  const now = new Date();

  for (const customer of customers) {
    const customerId = customer._id.toString();
    const orders = ordersByCustomer[customerId] || [];

    const profileData = generateProfileData(customer, orders, now);

    bulkOps.push({
      updateOne: {
        filter: { customerId },
        update: { $set: profileData },
        upsert: true
      }
    });
  }

  if (bulkOps.length > 0) {
    await CustomerProfile.bulkWrite(bulkOps);
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
  const customer = await Customer.findById(customerId).lean();
  if (!customer) return;

  const orders = await Order.find({ customerId }).lean();
  const profileData = generateProfileData(customer, orders, new Date());

  await CustomerProfile.findOneAndUpdate(
    { customerId },
    profileData,
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
