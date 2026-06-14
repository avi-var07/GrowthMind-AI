import mongoose, { Document, Schema } from "mongoose";

// AttributedRevenue records when a customer order can be credited to a campaign
// Rule: if a customer clicks a campaign and places an order within 7 days → attribute that revenue
export interface IAttributedRevenue extends Document {
  campaignId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  revenue: number;
  attributedAt: Date;
}

const AttributedRevenueSchema = new Schema<IAttributedRevenue>(
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
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    revenue: { type: Number, required: true },
    attributedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AttributedRevenueSchema.index({ campaignId: 1 });

export default mongoose.model<IAttributedRevenue>(
  "AttributedRevenue",
  AttributedRevenueSchema
);
