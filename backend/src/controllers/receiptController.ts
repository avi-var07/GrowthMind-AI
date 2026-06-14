import { Request, Response } from "express";
import Communication from "../models/Communication";
import Receipt from "../models/Receipt";
import Order from "../models/Order";
import AttributedRevenue from "../models/AttributedRevenue";

// POST /api/receipt - async callback from Channel Service
export async function handleReceipt(req: Request, res: Response) {
  try {
    const { campaignId, customerId, status, communicationId } = req.body;

    if (!campaignId || !customerId || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Save receipt for audit trail
    console.log(`[CRM Receipt API] Received async callback from Channel Service for comm ${communicationId} -> ${status}`);
    await Receipt.create({ campaignId, customerId, status });

    // BUG FIX: Status transitions must only go FORWARD.
    // Previous code could downgrade CLICKED → DELIVERED when no communicationId
    // was provided and the findOneAndUpdate matched an already-progressed record.
    // Fix: only update if the new status represents a progression.
    const STATUS_ORDER: Record<string, number> = {
      PENDING: 0,
      DELIVERED: 1,
      OPENED: 2,
      CLICKED: 3,
      FAILED: 4,
    };

    if (communicationId) {
      // Provided communicationId — update only if new status is a progression
      const comm = await Communication.findById(communicationId);
      if (comm) {
        const currentRank = STATUS_ORDER[comm.status] ?? 0;
        const newRank = STATUS_ORDER[status] ?? 0;
        // Allow FAILED at any time, otherwise only allow forward progression
        if (status === "FAILED" || newRank > currentRank) {
          await Communication.findByIdAndUpdate(communicationId, {
            status,
            updatedAt: new Date(),
          });
        }
      }
    } else {
      // No communicationId — find the specific communication by campaign+customer
      // Only update if current status can legitimately transition to new status
      const currentRank = STATUS_ORDER[status] ?? 0;
      const previousStatuses = Object.entries(STATUS_ORDER)
        .filter(([, rank]) => rank < currentRank)
        .map(([s]) => s);

      if (status === "FAILED") {
        // FAILED can replace any non-failed status
        await Communication.findOneAndUpdate(
          {
            campaignId,
            customerId,
            status: { $nin: ["FAILED"] },
          },
          { status, updatedAt: new Date() },
          { sort: { createdAt: -1 } }
        );
      } else {
        // Only update if current status is a valid predecessor
        await Communication.findOneAndUpdate(
          {
            campaignId,
            customerId,
            status: { $in: previousStatuses.length > 0 ? previousStatuses : ["PENDING"] },
          },
          { status, updatedAt: new Date() },
          { sort: { createdAt: -1 } }
        );
      }
    }

    // Revenue attribution — only on CLICKED
    if (status === "CLICKED") {
      await attributeRevenue(campaignId, customerId);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Receipt handling error:", error);
    res.status(500).json({ error: "Failed to process receipt" });
  }
}

// BUG FIX: Revenue attribution window anchored to CLICK TIME, not current time.
// Previous code used `new Date()` as the reference point, meaning a click
// processed 8 days after it happened would miss the order window entirely.
// We now find the communication's updatedAt timestamp as the click anchor.
async function attributeRevenue(campaignId: string, customerId: string) {
  try {
    // Find the CLICKED communication to get the actual click timestamp
    const clickedComm = await Communication.findOne({
      campaignId,
      customerId,
      status: "CLICKED",
    }).sort({ updatedAt: -1 });

    // Use click time if available, otherwise fall back to now
    const clickTime = clickedComm?.updatedAt ?? new Date();
    const sevenDaysAfterClick = new Date(clickTime.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysBeforeClick = new Date(clickTime.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Orders placed within 7 days AFTER the click (forward window)
    // Also include orders placed up to 7 days BEFORE click to handle
    // cases where callback is delayed
    const relatedOrders = await Order.find({
      customerId,
      orderDate: {
        $gte: sevenDaysBeforeClick,
        $lte: sevenDaysAfterClick,
      },
    });

    for (const order of relatedOrders) {
      // Never double-attribute the same order
      const existing = await AttributedRevenue.findOne({ orderId: order._id });
      if (!existing) {
        await AttributedRevenue.create({
          campaignId,
          customerId,
          orderId: order._id,
          revenue: order.amount,
        });
        console.log(
          `[Attribution] ₹${order.amount} attributed to campaign ${campaignId} for customer ${customerId}`
        );
      }
    }
  } catch (error) {
    console.error("[Attribution] Error:", error);
  }
}
