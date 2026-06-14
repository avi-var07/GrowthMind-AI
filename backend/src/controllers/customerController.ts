import { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import Customer from "../models/Customer";
import { buildAllProfiles } from "../services/customerProfileService";

// GET /api/customers - list all customers with pagination
export async function getCustomers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(query),
    ]);

    res.json({ customers, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
}

// POST /api/customers/upload - upload CSV file of customers
export async function uploadCustomers(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const csvContent = req.file.buffer.toString("utf-8");

    // Parse CSV - expects columns: name, email, phone, city
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let created = 0;
    let skipped = 0;
    const failures: { row: number; reason: string }[] = [];

    // Track rows (1-indexed based on data rows)
    let rowIndex = 1;
    for (const record of records) {
      try {
        if (!record.email) {
          throw new Error("Missing Email");
        }
        if (!record.name) {
          throw new Error("Missing Name");
        }
        if (!record.phone) {
          throw new Error("Missing Phone");
        }
        if (!record.city) {
          throw new Error("Missing City");
        }

        await Customer.create({
          name: record.name,
          email: record.email.toLowerCase(),
          phone: record.phone,
          city: record.city,
          createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
        });
        created++;
      } catch (err: any) {
        skipped++;
        // Catch MongoDB Duplicate Key Error for emails
        if (err.code === 11000) {
          failures.push({ row: rowIndex, reason: "Duplicate Email" });
        } else {
          failures.push({ row: rowIndex, reason: err.message || "Invalid Data" });
        }
      }
      rowIndex++;
    }

    // Rebuild profiles after data upload
    const rebuiltCount = await buildAllProfiles().catch(err => {
      console.error("Profile rebuild error:", err);
      return 0;
    });

    res.json({ message: "Upload complete", created, skipped, rebuiltCount, failures });
  } catch (error) {
    console.error("CSV upload error:", error);
    res.status(500).json({ error: "Failed to process CSV" });
  }
}

// GET /api/customers/stats - basic stats for dashboard
export async function getCustomerStats(req: Request, res: Response) {
  try {
    const total = await Customer.countDocuments();
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}
