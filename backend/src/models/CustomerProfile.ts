import mongoose, { Document, Schema } from "mongoose";

// CustomerProfile is a computed summary of a customer's buying behavior
export interface ICustomerProfile extends Document {
  customerId: mongoose.Types.ObjectId;
  totalSpend: number;
  totalOrders: number;
  lastOrderDate: Date | null;
  favoriteCategory: string;
  avgOrderValue: number;
  // Tags like "VIP Customer", "Inactive Customer", "Coffee Enthusiast"
  tags: string[];
  // Churn risk: high / medium / low
  churnRisk: "high" | "medium" | "low";
  // How many days since last order
  daysSinceLastOrder: number;
  city: string;
  updatedAt: Date;
}

const CustomerProfileSchema = new Schema<ICustomerProfile>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },
    totalSpend: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    lastOrderDate: { type: Date, default: null },
    favoriteCategory: { type: String, default: "" },
    avgOrderValue: { type: Number, default: 0 },
    tags: [{ type: String }],
    churnRisk: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "low",
    },
    daysSinceLastOrder: { type: Number, default: 0 },
    city: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.model<ICustomerProfile>(
  "CustomerProfile",
  CustomerProfileSchema
);
