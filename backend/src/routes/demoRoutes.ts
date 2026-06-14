import { Router, Request, Response } from "express";
import Customer from "../models/Customer";
import { seedDatabase } from "../services/seedService";

const router = Router();

// POST /api/demo/load
// Loads demo data. Requires { force: true } if data already exists.
router.post("/load", async (req: Request, res: Response) => {
  try {
    const { force } = req.body;

    const existingCustomersCount = await Customer.countDocuments();
    
    // If data exists and force is not explicitly true, reject
    if (existingCustomersCount > 0 && force !== true) {
      return res.status(400).json({ 
        error: "Data already exists. Requires force=true to override." 
      });
    }

    // Load demo dataset (clears existing if any)
    const result = await seedDatabase(true);

    return res.json(result);
  } catch (error: any) {
    console.error("[Demo Route] Failed to load demo data:", error);
    return res.status(500).json({ error: "Failed to load demo data." });
  }
});

import mongoose from "mongoose";

// POST /api/demo/clear
// Clears all data in the database
router.post("/clear", async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    return res.json({ message: "Data cleared successfully." });
  } catch (error: any) {
    console.error("[Demo Route] Failed to clear data:", error);
    return res.status(500).json({ error: "Failed to clear data." });
  }
});

export default router;
