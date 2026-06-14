import mongoose, { Document, Schema } from "mongoose";

// CampaignLearning stores what we learned from past campaigns
// This is the "Marketing Memory" - AI reads this before making new recommendations
export interface ICampaignLearning extends Document {
  campaignId: mongoose.Types.ObjectId;
  campaignName: string;
  segmentDescription: string;
  audienceSize: number;
  openRate: number;    // actual open rate (0-100)
  clickRate: number;   // actual click rate (0-100)
  deliveryRate: number;
  revenue: number;     // attributed revenue
  bestChannel: string;
  createdAt: Date;
}

const CampaignLearningSchema = new Schema<ICampaignLearning>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      unique: true,
    },
    campaignName: { type: String, required: true },
    segmentDescription: { type: String, default: "" },
    audienceSize: { type: Number, default: 0 },
    openRate: { type: Number, default: 0 },
    clickRate: { type: Number, default: 0 },
    deliveryRate: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    bestChannel: { type: String, default: "whatsapp" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.model<ICampaignLearning>(
  "CampaignLearning",
  CampaignLearningSchema
);
