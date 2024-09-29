import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Vendor } from '../schemas/vendor.schema';
import { Model } from 'mongoose';
import { nanoid } from 'nanoid';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    @InjectModel('Vendor') private vendorModel: Model<Vendor>,
  ) {}

  /**
   * Retrieves the vendorId for a given manufacturer ID.
   * If the vendor does not exist, it creates a new one.
   * @param manufacturerId - The ManufacturerID from CSV.
   * @param manufacturerName - The ManufacturerName from CSV.
   * @returns The vendorId.
   */
  async getVendorId(manufacturerId: number, manufacturerName: string): Promise<string> {
    
    let vendor = await this.vendorModel.findOne({ vendorId: manufacturerId.toString() }).exec();

    if (vendor) {
      return vendor.vendorId;
    }

    
    const newVendorId = nanoid();
    vendor = new this.vendorModel({
      vendorId: newVendorId,
      name: manufacturerName,
    });

    try {
      await vendor.save();
      this.logger.log(`Created new vendor with vendorId: ${newVendorId}`);
      return newVendorId;
    } catch (error) {
      this.logger.error(`Error creating vendor: ${error.message}`);
      throw error;
    }
  }
}
