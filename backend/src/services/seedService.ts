import mongoose from "mongoose";
import Customer from "../models/Customer";
import Order from "../models/Order";
import CustomerProfile from "../models/CustomerProfile";
import { buildAllProfiles } from "./customerProfileService";

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

const PERSONA_COUNTS: Record<PersonaType, number> = {
  VIP_ACTIVE: 30,      
  VIP_CHURNED: 25,     
  HIGH_SPENDER: 40,    
  COLD_BREW_FAN: 35,   
  PREMIUM_LOVER: 35,   
  DISCOUNT: 30,        
  LOYAL: 35,           
  ONE_TIME: 40,        
  HIGH_RISK: 60,       
  MEDIUM_RISK: 50,     
  REGULAR: 120,        
};

interface OrderSpec {
  category: Category;
  amount: number;
  daysAgoMin: number;
  daysAgoMax: number;
}

function buildOrdersForPersona(
  customerId: any,
  persona: PersonaType
): OrderSpec[] {
  const orders: OrderSpec[] = [];

  switch (persona) {
    case "VIP_ACTIVE": {
      const count = randomBetween(15, 25);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        orders.push({ category: cat, amount: randomBetween(350, 600), daysAgoMin: 0, daysAgoMax: 20 });
      }
      break;
    }
    case "VIP_CHURNED": {
      const count = randomBetween(15, 20);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        orders.push({ category: cat, amount: randomBetween(350, 600), daysAgoMin: 50, daysAgoMax: 180 });
      }
      break;
    }
    case "HIGH_SPENDER": {
      const count = randomBetween(8, 14);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        orders.push({ category: cat, amount: randomBetween(250, 450), daysAgoMin: 0, daysAgoMax: 60 });
      }
      break;
    }
    case "COLD_BREW_FAN": {
      const count = randomBetween(4, 10);
      for (let i = 0; i < count; i++) {
        const cat: Category = i < Math.ceil(count * 0.7) ? "Cold Brew" : randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 50, daysAgoMax: 120 });
      }
      break;
    }
    case "PREMIUM_LOVER": {
      const count = randomBetween(3, 8);
      for (let i = 0; i < count; i++) {
        const cat: Category = i < Math.ceil(count * 0.65) ? "Premium Beans" : randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 0, daysAgoMax: 45 });
      }
      break;
    }
    case "DISCOUNT": {
      const count = randomBetween(5, 12);
      for (let i = 0; i < count; i++) {
        const cat: Category = randomItem(["Espresso", "Latte", "Cappuccino"]);
        orders.push({ category: cat, amount: randomBetween(120, 195), daysAgoMin: 0, daysAgoMax: 60 });
      }
      break;
    }
    case "LOYAL": {
      const count = randomBetween(10, 18);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 0, daysAgoMax: 30 });
      }
      break;
    }
    case "ONE_TIME": {
      const cat = randomItem(COFFEE_CATEGORIES);
      const [min, max] = CATEGORY_PRICES[cat];
      orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 10, daysAgoMax: 120 });
      break;
    }
    case "HIGH_RISK": {
      const count = randomBetween(2, 6);
      for (let i = 0; i < count; i++) {
        const cat = randomItem(COFFEE_CATEGORIES);
        const [min, max] = CATEGORY_PRICES[cat];
        orders.push({ category: cat, amount: randomBetween(min, max), daysAgoMin: 46, daysAgoMax: 120 });
      }
      break;
    }
    case "MEDIUM_RISK": {
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

// ─── Exported Seed Service ─────────────────────────────────────────────────────
export async function seedDatabase(clearExisting: boolean = true) {
  if (clearExisting && mongoose.connection.db) {
    console.log("🗑️  Dropping existing database...");
    await mongoose.connection.db.dropDatabase();
  }

  const personaList: PersonaType[] = [];
  for (const [persona, count] of Object.entries(PERSONA_COUNTS)) {
    for (let i = 0; i < count; i++) {
      personaList.push(persona as PersonaType);
    }
  }

  for (let i = personaList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [personaList[i], personaList[j]] = [personaList[j], personaList[i]];
  }

  console.log("👥 Generating 500 customers with persona-based distribution...");
  const customers = personaList.map((_, i) => {
    const { name, email } = makeName(i);
    return {
      _id: new mongoose.Types.ObjectId(),
      name,
      email,
      phone: generatePhone(),
      city: randomItem(CITIES),
      createdAt: randomDaysAgo(30, 365),
    };
  });

  await Customer.insertMany(customers, { lean: true, ordered: false });
  
  console.log("📦 Generating orders with persona-based distribution...");
  const allOrders: any[] = [];
  let totalOrderCount = 0;

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
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

  // Use lean and ordered:false to significantly speed up large inserts
  await Order.insertMany(allOrders, { lean: true, ordered: false });

  console.log("🧠 Building customer profiles...");
  const rebuiltCount = await buildAllProfiles();

  const vipCount = await CustomerProfile.countDocuments({ tags: "VIP Customer" });
  const highChurn = await CustomerProfile.countDocuments({ churnRisk: "high" });

  return {
    customers: customers.length,
    orders: totalOrderCount,
    profiles: rebuiltCount,
    vipCustomers: vipCount,
    highChurn: highChurn
  };
}
