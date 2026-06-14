import mongoose, { Document, Schema } from "mongoose";

// Communication is one message sent to one customer in a campaign
// Status flow: PENDING → DELIVERED → OPENED → CLICKED (or FAILED at any step)
export interface ICommunication extends Document {
  campaignId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  channel: "whatsapp" | "email";
  message: string;
  status: "PENDING" | "DELIVERED" | "OPENED" | "CLICKED" | "FAILED";
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationSchema = new Schema<ICommunication>(
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
    channel: { type: String, enum: ["whatsapp", "email"], required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "DELIVERED", "OPENED", "CLICKED", "FAILED"],
      default: "PENDING",
    },
    retryCount: { type: Number, default: 0 },
    // BUG FIX: Use timestamps:true so Mongoose auto-manages createdAt/updatedAt.
    // The previous manual default for updatedAt never changed after creation.
  },
  {
    // Let Mongoose manage both timestamps automatically.
    // updatedAt will now be updated on every save/findByIdAndUpdate.
    timestamps: true,
  }
);

// Index for fast campaign status lookups
CommunicationSchema.index({ campaignId: 1, status: 1 });
CommunicationSchema.index({ customerId: 1 });
CommunicationSchema.index({ status: 1 });

export default mongoose.model<ICommunication>(
  "Communication",
  CommunicationSchema
);
