import { Schema, Document } from 'mongoose';

export interface Image {
  fileName: string;
  cdnLink: string | null;
  i: number;
  alt: string | null;
}

export interface Variant {
  id: string;
  available: boolean;
  attributes: {
    packaging: string;
    description: string;
  };
  cost: number;
  currency: string;
  description: string;
  manufacturerItemCode: string;
  manufacturerItemId: string;
  packaging: string;
  price: number;
  sku: string;
  active: boolean;
  images: Image[];
  itemCode: string;
}

export interface ProductData {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  vendorId: string;
  manufacturerId: string;
  storefrontPriceVisibility: string;
  variants: Variant[];
  isDeleted?: boolean; 
}

export interface Product extends Document {
  docId: string;
  fullData: any; 
  data: ProductData;
}

export const ProductSchema = new Schema({
  docId: { type: String, required: true, unique: true },
  fullData: { type: Schema.Types.Mixed, default: null },
  data: {
    name: { type: String, required: true, unique: true }, 
    type: { type: String, required: true },
    shortDescription: { type: String },
    description: { type: String },
    vendorId: { type: String, required: true },
    manufacturerId: { type: String, required: true },
    storefrontPriceVisibility: { type: String },
    variants: [{ type: Schema.Types.Mixed }],
    isDeleted: { type: Boolean, default: false },
  },
});
