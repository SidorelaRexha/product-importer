import { Schema, Document } from 'mongoose';

export interface Manufacturer extends Document {
  manufacturerId: string;
  name: string;
}

export const ManufacturerSchema = new Schema({
  manufacturerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});
