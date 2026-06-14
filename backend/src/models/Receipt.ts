import mongoose, { Document, Schema } from "mongoose";

// Receipt is the callback payload received from the Channel Service
// It records every status update for audit purposes
export interface IReceipt extends Document {
  campaignId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  status: "DELIVERED" | "OPENED" | "CLICKED" | "FAILED";
  receivedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    status: {
      type: String,
      enum: ["DELIVERED", "OPENED", "CLICKED", "FAILED"],
      required: true,
    },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.model<IReceipt>("Receipt", ReceiptSchema);
