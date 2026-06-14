import mongoose from "mongoose";
import dotenv from "dotenv";
import Customer from "../models/Customer";
import Order from "../models/Order";
import CustomerProfile from "../models/CustomerProfile";
import { buildAllProfiles } from "../services/customerProfileService";

dotenv.config();

// ─── Constants ────────────────────────────────────────────────────────────────
const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat",
  "Lucknow", "Kochi", "Indore", "Bhopal", "Nagpur",
];

const COFFEE_CATEGORIES = [
  "Espresso", "Latte", "Cappuccino", "Cold Brew", "Premium Beans",
] as const;

type Category = typeof COFFEE_CATEGORIES[number];

const CATEGORY_PRICES: Record<Category, [number, number]> = {
  Espresso: [120, 250],
  Latte: [180, 320],
  Cappuccino: [160, 300],
  "Cold Brew": [200, 380],
  "Premium Beans": [400, 1200],
};

const FIRST_NAMES = [
  "Rahul", "Priya", "Amit", "Sneha", "Rohan", "Anjali", "Vikram", "Kavya",
  "Arjun", "Divya", "Kiran", "Pooja", "Suresh", "Meera", "Ravi", "Nisha",
  "Aditya", "Shreya", "Nikhil", "Ananya", "Deepak", "Swati", "Manish",
  "Kritika", "Sanjay", "Preeti", "Rajesh", "Sunita", "Gaurav", "Ritika",
  "Akash", "Neha", "Vikas", "Pallavi", "Mohit", "Sakshi", "Ashish",
  "Tanvi", "Abhishek", "Ishita", "Kunal", "Deeksha", "Harsh", "Tanya",
  "Varun", "Sonia", "Pranav", "Megha", "Sahil", "Khushi",
];

const LAST_NAMES = [
  "Sharma", "Gupta", "Singh", "Kumar", "Patel", "Joshi", "Mehta",
  "Agarwal", "Verma", "Mishra", "Shah", "Nair", "Reddy", "Rao",
  "Iyer", "Pillai", "Bose", "Das", "Chatterjee", "Banerjee",
  "Kapoor", "Malhotra", "Chopra", "Khanna", "Saxena",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomDaysAgo(min: number, max: number): Date {
  return daysAgo(randomBetween(min, max));
}

function generatePhone(): string {
  return `+91${randomBetween(7000000000, 9999999999)}`;
}

function makeName(i: number): { name: string; email: string } {
  const first = randomItem(FIRST_NAMES);
  const last = randomItem(LAST_NAMES);
  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@email.com`,
  };
}

// ─── Persona Definitions ─────────────────────────────────────────────────────
// BUG FIX: Previous seed used a pure power-law distribution that concentrated
// ALL orders on ~50 customers. This meant segmentation prompts like
// "high risk churn customers who love Cold Brew" returned 0 results because
// the churned customers had no Cold Brew orders.
//
// Fix: Explicitly generate named personas with guaranteed characteristics.
// Each persona maps to how profiles and tags are built in customerProfileService.
//
// Personas and their resulting profile tags:
//   VIP_ACTIVE     → totalSpend > 5000, ordered recently        → "VIP Customer", "Loyal Customer"
//   VIP_CHURNED    → totalSpend > 5000, last order > 45 days    → "VIP Customer", "Inactive Customer"
//   HIGH_SPENDER   → totalSpend 3001-5000, recent               → "High Spender"
//   COLD_BREW_FAN  → favoriteCategory = Cold Brew, churned      → "Cold Brew Fan", churnRisk high/medium
//   PREMIUM_LOVER  → favoriteCategory = Premium Beans           → "Coffee Enthusiast"
//   DISCOUNT       → avgOrderValue < 200                        → "Discount Seeker"
//   LOYAL          → totalOrders >= 10, recent                  → "Loyal Customer"
//   ONE_TIME       → totalOrders = 1                            → "One-Time Buyer"
//   HIGH_RISK      → last order > 45 days                       → churnRisk = "high"
//   MEDIUM_RISK    → last order 31-45 days                      → churnRisk = "medium"
//   REGULAR        → everything else

type PersonaType =
  | "VIP_ACTIVE"
  | "VIP_CHURNED"
  | "HIGH_SPENDER"
  | "COLD_BREW_FAN"
  | "PREMIUM_LOVER"
  | "DISCOUNT"
  | "LOYAL"
  | "ONE_TIME"
  | "HIGH_RISK"
  | "MEDIUM_RISK"
  | "REGULAR";

// How many of each persona to generate (totals to 500)
const PERSONA_COUNTS: Record<PersonaType, number> = {
  VIP_ACTIVE: 30,      // 30 VIP customers who are still active
  VIP_CHURNED: 25,     // 25 VIP customers who have churned → key re-engagement target
  HIGH_SPENDER: 40,    // 40 high spenders
  COLD_BREW_FAN: 35,   // 35 Cold Brew lovers, mix of active and churned
  PREMIUM_LOVER: 35,   // 35 Premium Beans enthusiasts
  DISCOUNT: 30,        // 30 discount seekers (low avg order value)
  LOYAL: 35,           // 35 loyal customers (10+ orders)
  ONE_TIME: 40,        // 40 one-time buyers
  HIGH_RISK: 60,       // 60 high churn risk (45+ days inactive)
  MEDIUM_RISK: 50,     // 50 medium churn risk (31-45 days inactive)
  REGULAR: 120,        // 120 regular customers (fills the rest)
};
// Total = 500 ✓

interface OrderSpec {
  category: Category;
  amount: number;
  daysAgoMin: number;
  daysAgoMax: number;
}

// Build orders for each persona type
function buildOrdersForPersona(
  customerId: any,
  persona: PersonaType
): OrderSpec[] {
  const orders: OrderSpec[] = [];

  switch (persona) {
    case "VIP_ACTIVE": {
      // 15-25 orders, high spend, ordered recently
      const count = randomBetween(15, 25);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        // Force high amount to ensure total > 5000
        orders.push({ category: cat, amount: randomBetween(350, 600), daysAgoMin: 0, daysAgoMax: 20 });
      }
      break;
    }

    case "VIP_CHURNED": {
      // 15-20 historical orders, all orders strictly > 45 days ago
      const count = randomBetween(15, 20);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        // Force high amount to ensure total > 5000
        orders.push({ category: cat, amount: randomBetween(350, 600), daysAgoMin: 50, daysAgoMax: 180 });
      }
      break;
    }

    case "HIGH_SPENDER": {
      // 8-14 orders, mix of categories, spend between 3001-5000
      const count = randomBetween(8, 14);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        orders.push({ category: cat, amount: randomBetween(250, 450), daysAgoMin: 0, daysAgoMax: 60 });
      }
      break;
    }

    case "COLD_BREW_FAN": {
      // Majority Cold Brew orders, churned (strictly > 45 days)
      const count = randomBetween(4, 10);
      for (let i = 0; i < count; i++) {
        const cat: Category = i < Math.ceil(count * 0.7) ? "Cold Brew" : randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        // Strictly high churn (50-120 days ago)
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 50, daysAgoMax: 120 });
      }
      break;
    }

    case "PREMIUM_LOVER": {
      // Majority Premium Beans orders, varied recency
      const count = randomBetween(3, 8);
      for (let i = 0; i < count; i++) {
        const cat: Category = i < Math.ceil(count * 0.65) ? "Premium Beans" : randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 0, daysAgoMax: 45 });
      }
      break;
    }

    case "DISCOUNT": {
      // Many small orders (avgOrderValue < 200)
      const count = randomBetween(5, 12);
      for (let i = 0; i < count; i++) {
        // Only cheap categories
        const cat: Category = randomItem(["Espresso", "Latte", "Cappuccino"]);
        orders.push({ category: cat, amount: randomBetween(120, 195), daysAgoMin: 0, daysAgoMax: 60 });
      }
      break;
    }

    case "LOYAL": {
      // 10-18 orders, active recently
      const count = randomBetween(10, 18);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 0, daysAgoMax: 30 });
      }
      break;
    }

    case "ONE_TIME": {
      // Exactly 1 order
      const cat = randomItem(COFFEE_CATEGORIES);
      const [min, max] = CATEGORY_PRICES[cat];
      orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 10, daysAgoMax: 120 });
      break;
    }

    case "HIGH_RISK": {
      // Last order 46-120 days ago, 2-6 total orders
      const count = randomBetween(2, 6);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 46, daysAgoMax: 120 });
      }
      break;
    }

    case "MEDIUM_RISK": {
      // Last order 31-45 days ago
      const count = randomBetween(2, 6);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 31, daysAgoMax: 45 });
      }
      break;
    }

    case "REGULAR":
    default: {
      // 2-8 orders, random recency
      const count = randomBetween(2, 8);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 0, daysAgoMax: 60 });
      }
      break;
    }
  }

  return orders;
}

// ─── Seed Function ────────────────────────────────────────────────────────────
async function seed() {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/growthminds";

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  // BUG FIX: Drop the entire database to clear all stale data, including collections
  // like customerProfiles, campaigns, communications, etc.
  console.log("🗑️  Dropping existing database...");
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }

  // Build the persona list — expand each persona type to its count
  const personaList: PersonaType[] = [];
  for (const [persona, count] of Object.entries(PERSONA_COUNTS)) {
    for (let i = 0; i < count; i++) {
      personaList.push(persona as PersonaType);
    }
  }

  // Shuffle so personas are not grouped sequentially
  for (let i = personaList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [personaList[i], personaList[j]] = [personaList[j], personaList[i]];
  }

  console.log("👥 Generating 500 customers with persona-based distribution...");
  const customers = personaList.map((_, i) => {
    const { name, email } = makeName(i);
    return {
      name,
      email,
      phone: generatePhone(),
      city: randomItem(CITIES),
      createdAt: randomDaysAgo(30, 365),
    };
  });

  const savedCustomers = await Customer.insertMany(customers);
  console.log(`✅ Created ${savedCustomers.length} customers`);

  // Generate orders for each customer based on their persona
  console.log("📦 Generating orders with persona-based distribution...");
  const allOrders: any[] = [];
  let totalOrderCount = 0;

  for (let i = 0; i < savedCustomers.length; i++) {
    const customer = savedCustomers[i];
    const persona = personaList[i];
    const orderSpecs = buildOrdersForPersona(customer._id, persona);

    for (const spec of orderSpecs) {
      allOrders.push({
        customerId: customer._id,
        amount: spec.amount,
        category: spec.category,
        orderDate: randomDaysAgo(spec.daysAgoMin, spec.daysAgoMax),
      });
      totalOrderCount++;
    }
  }

  await Order.insertMany(allOrders);
  console.log(`✅ Created ${totalOrderCount} orders`);

  // Build profiles
  console.log("🧠 Building customer profiles...");
  await buildAllProfiles();

  // Print verification stats
  const profileStats = await CustomerProfile.aggregate([
    {
      $group: {
        _id: "$churnRisk",
        count: { $sum: 1 },
        avgSpend: { $avg: "$totalSpend" },
      },
    },
  ]);

  const tagStats = await CustomerProfile.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const categoryStats = await CustomerProfile.aggregate([
    { $group: { _id: "$favoriteCategory", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  console.log("\n🎉 Seed complete!");
  console.log(`   Customers: ${savedCustomers.length}`);
  console.log(`   Orders: ${totalOrderCount}`);
  console.log("\n📊 Churn Risk Distribution:");
  profileStats.forEach((s) =>
    console.log(
      `   ${s._id}: ${s.count} customers (avg spend ₹${Math.round(s.avgSpend)})`
    )
  );
  console.log("\n🏷️  Tag Distribution:");
  tagStats.forEach((s) => console.log(`   ${s._id}: ${s.count}`));
  console.log("\n☕ Favorite Category Distribution:");
  categoryStats.forEach((s) => console.log(`   ${s._id}: ${s.count}`));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
