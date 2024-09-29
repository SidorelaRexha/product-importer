import { Schema, Document } from 'mongoose';

export interface Vendor extends Document {
  vendorId: string;
  name: string;
}

export const VendorSchema = new Schema({
  vendorId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});
