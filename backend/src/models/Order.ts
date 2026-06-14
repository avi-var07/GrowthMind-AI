import mongoose, { Document, Schema } from "mongoose";

// Order represents a coffee purchase made by a customer
export interface IOrder extends Document {
  customerId: mongoose.Types.ObjectId;
  amount: number;
  category: string;
  orderDate: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    // Coffee product category
    category: {
      type: String,
      required: true,
      enum: ["Espresso", "Latte", "Cappuccino", "Cold Brew", "Premium Beans"],
    },
    orderDate: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Index for fast customer order lookups
OrderSchema.index({ customerId: 1, orderDate: -1 });

export default mongoose.model<IOrder>("Order", OrderSchema);
