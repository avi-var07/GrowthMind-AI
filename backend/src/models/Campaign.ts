import mongoose, { Document, Schema } from "mongoose";

// Campaign represents a marketing campaign sent to a customer segment
export interface ICampaign extends Document {
  name: string;
  // Segment description (from AI chat)
  segmentDescription: string;
  audienceSize: number;
  // Customer IDs in this campaign
  audienceIds: mongoose.Types.ObjectId[];
  // Predicted metrics from simulator
  predictedRevenue: number;
  predictedOpenRate: number;
  predictedClickRate: number;
  confidenceScore: number;
  // Message templates
  whatsappMessage: string;
  emailMessage: string;
  // Campaign status
  status: "draft" | "sent" | "completed";
  createdAt: Date;
  sentAt: Date | null;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true },
    segmentDescription: { type: String, default: "" },
    audienceSize: { type: Number, default: 0 },
    audienceIds: [{ type: Schema.Types.ObjectId, ref: "Customer" }],
    predictedRevenue: { type: Number, default: 0 },
    predictedOpenRate: { type: Number, default: 0 },
    predictedClickRate: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 0 },
    whatsappMessage: { type: String, default: "" },
    emailMessage: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "sent", "completed"],
      default: "draft",
    },
    createdAt: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
  },
  { timestamps: false }
);

CampaignSchema.index({ createdAt: -1 });

export default mongoose.model<ICampaign>("Campaign", CampaignSchema);
