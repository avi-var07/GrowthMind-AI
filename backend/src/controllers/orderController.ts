import { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import Order from "../models/Order";
import Customer from "../models/Customer";
import { buildAllProfiles } from "../services/customerProfileService";

// GET /api/orders - list orders with pagination
export async function getOrders(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find()
        .populate("customerId", "name email city")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(),
    ]);

    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
}

// POST /api/orders/upload - upload CSV of orders
// CSV columns: customerEmail, amount, category, orderDate
export async function uploadOrders(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const csvContent = req.file.buffer.toString("utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let created = 0;
    let skipped = 0;
    const failures: { row: number; reason: string }[] = [];
    const validCategories = ["Cold Brew", "Latte", "Espresso", "Cappuccino", "Premium Beans"];

    let rowIndex = 1;
    for (const record of records) {
      try {
        if (!record.customerEmail) {
          throw new Error("Missing Customer Email");
        }
        
        const amount = parseFloat(record.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid Amount");
        }

        if (!validCategories.includes(record.category)) {
          throw new Error("Invalid Category");
        }

        const parsedDate = new Date(record.orderDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid Date");
        }

        const customer = await Customer.findOne({
          email: record.customerEmail.toLowerCase(),
        });
        
        if (!customer) {
          throw new Error("Customer Not Found");
        }

        await Order.create({
          customerId: customer._id,
          amount,
          category: record.category,
          orderDate: parsedDate,
        });
        created++;
      } catch (err: any) {
        skipped++;
        failures.push({ row: rowIndex, reason: err.message || "Invalid Data" });
      }
      rowIndex++;
    }

    // Rebuild all customer profiles after order upload
    const rebuiltCount = await buildAllProfiles().catch(err => {
      console.error("Profile rebuild error:", err);
      return 0;
    });

    res.json({ message: "Upload complete", created, skipped, rebuiltCount, failures });
  } catch (error) {
    console.error("Order CSV upload error:", error);
    res.status(500).json({ error: "Failed to process CSV" });
  }
}

// GET /api/orders/stats
export async function getOrderStats(req: Request, res: Response) {
  try {
    const total = await Order.countDocuments();
    const result = await Order.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);
    const totalRevenue = result[0]?.totalRevenue || 0;

    // Category breakdown
    const categories = await Order.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 }, revenue: { $sum: "$amount" } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ total, totalRevenue, categories });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order stats" });
  }
}
