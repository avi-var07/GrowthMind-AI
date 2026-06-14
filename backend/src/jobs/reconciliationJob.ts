import cron from "node-cron";
import Communication from "../models/Communication";
import { sendToChannelService } from "../services/channelService";

// Reconciliation Worker
// Runs every 5 minutes to handle stuck PENDING communications
// This demonstrates async reliability in a distributed system
export function startReconciliationJob() {
  console.log("Reconciliation job scheduled (every 5 minutes)");

  cron.schedule("*/5 * * * *", async () => {
    console.log("[Reconciliation] Running check for stuck communications...");

    try {
      // Find communications stuck in PENDING for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const stuckCommunications = await Communication.find({
        status: "PENDING",
        createdAt: { $lte: tenMinutesAgo },
      }).limit(50);

      console.log(
        `[Reconciliation] Found ${stuckCommunications.length} stuck communications`
      );

      for (const comm of stuckCommunications) {
        if (comm.retryCount >= 1) {
          // Already retried once - mark as FAILED
          await Communication.findByIdAndUpdate(comm._id, {
            status: "FAILED",
            updatedAt: new Date(),
          });
          console.log(
            `[Reconciliation] Marked comm ${comm._id} as FAILED (max retries reached)`
          );
        } else {
          // Retry sending once
          try {
            const callbackUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/receipt`;
            await sendToChannelService({
              communicationId: comm._id.toString(),
              campaignId: comm.campaignId.toString(),
              customerId: comm.customerId.toString(),
              channel: comm.channel,
              message: comm.message,
              callbackUrl,
            });

            // Increment retry count
            await Communication.findByIdAndUpdate(comm._id, {
              retryCount: 1,
              updatedAt: new Date(),
            });
            console.log(`[Reconciliation] Retried comm ${comm._id}`);
          } catch (err) {
            // Retry also failed - mark as FAILED immediately
            await Communication.findByIdAndUpdate(comm._id, {
              status: "FAILED",
              retryCount: 1,
              updatedAt: new Date(),
            });
            console.log(
              `[Reconciliation] Retry failed for comm ${comm._id} - marked FAILED`
            );
          }
        }
      }
    } catch (error) {
      console.error("[Reconciliation] Job error:", error);
    }
  });
}
