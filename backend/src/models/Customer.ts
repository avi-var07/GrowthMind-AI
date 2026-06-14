import mongoose, { Document, Schema } from "mongoose";

// Customer represents a person who has bought from our coffee brand
export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  city: string;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

CustomerSchema.index({ createdAt: -1 });

export default mongoose.model<ICustomer>("Customer", CustomerSchema);
