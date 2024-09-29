import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Manufacturer } from '../schemas/manufacturer.schema';
import { Model } from 'mongoose';
import { nanoid } from 'nanoid';

@Injectable()
export class ManufacturerService {
  private readonly logger = new Logger(ManufacturerService.name);

  constructor(
    @InjectModel('Manufacturer') private manufacturerModel: Model<Manufacturer>,
  ) {}

  /**
   * Retrieves the manufacturerId for a given manufacturer ID.
   * If the manufacturer does not exist, it creates a new one.
   * @param manufacturerId - The ManufacturerID from CSV.
   * @param manufacturerName - The ManufacturerName from CSV.
   * @returns The manufacturerId.
   */
  async getManufacturerId(manufacturerId: number, manufacturerName: string): Promise<string> {
    
    let manufacturer = await this.manufacturerModel.findOne({ manufacturerId: manufacturerId.toString() }).exec();

    if (manufacturer) {
      return manufacturer.manufacturerId;
    }

    
    const newManufacturerId = nanoid();
    manufacturer = new this.manufacturerModel({
      manufacturerId: newManufacturerId,
      name: manufacturerName,
    });

    try {
      await manufacturer.save();
      this.logger.log(`Created new manufacturer with manufacturerId: ${newManufacturerId}`);
      return newManufacturerId;
    } catch (error) {
      this.logger.error(`Error creating manufacturer: ${error.message}`);
      throw error;
    }
  }
}
