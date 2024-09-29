import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { Product } from '../schemas/product.schema';
import { nanoid } from 'nanoid';
import { VendorService } from './vendor.service';
import { ManufacturerService } from './manufacturer.service';
import { DescriptionEnhancerService } from './description-enhancer.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private deleteFlag: boolean;

  constructor(
    @InjectModel('Product') private productModel: Model<Product>,
    private vendorService: VendorService,
    private manufacturerService: ManufacturerService,
    private descriptionEnhancer: DescriptionEnhancerService,
    private configService: ConfigService,
  ) {
    this.deleteFlag = this.configService.get<boolean>('DELETE_FLAG') || false;
  }

  /**
   * Scheduled task that runs daily at midnight to import products.
   * @Cron('0 0 * * *') // Runs every day at midnight
   */
  @Cron('0 0 * * *')
  async handleCron() {
    await this.importProducts();
  }

  /**
   * Manually trigger the product import process.
   */
  async importProducts() {
    this.logger.log('Starting product import task...');
    const filePath = this.configService.get<string>('CSV_FILE_PATH') || 'src/images40.txt';
  
    if (!fs.existsSync(filePath)) {
      this.logger.error(`CSV file not found at path: ${filePath}`);
      return;
    }
  
    const readStream = fs.createReadStream(filePath);
    const parser = csv({ separator: '\t', headers: true });
  
    const batchSize = 1000;
    let batch = [];
    const importedProductIds = new Set<string>();
  
    readStream.pipe(parser)
      .on('data', async (row) => {
        readStream.pause();
        try {
          this.logger.log(`Processing row: ${JSON.stringify(row)}`);
  
          if (!row.ManufacturerName) {
            this.logger.error('Skipping row due to missing ManufacturerName:', row);
            readStream.resume();
            return;
          }
  
          const transformedData = await this.transformRow(row);
          
          if (!transformedData.data.name) {
            this.logger.error('Transformed data does not contain name:', transformedData);
            readStream.resume();
            return; 
          }
  
          batch.push(transformedData);
          importedProductIds.add(transformedData.data.name);
  
          if (batch.length >= batchSize) {
            await this.upsertBatch(batch);
            batch = [];
          }
        } catch (error) {
          this.logger.error(`Error processing row: ${error.message}`);
        } finally {
          readStream.resume();
        }
      })
      .on('end', async () => {
        if (batch.length > 0) {
          await this.upsertBatch(batch);
        }
        if (this.deleteFlag) {
          await this.handleDeletions(importedProductIds);
        }
        this.logger.log('Product import task completed.');
      })
      .on('error', (error) => {
        this.logger.error(`Error reading CSV file: ${error.message}`);
      });
  }
  
  /**
   * Transforms a single CSV row into the Product format.
   * @param row - A single row from the CSV file.
   * @returns The transformed product data.
   */
  async transformRow(row: any): Promise<any> {
    const productId = row.ProductID;
    const docId = nanoid();

    const vendorId = await this.vendorService.getVendorId(
      parseInt(row.ManufacturerID, 10),
      row.ManufacturerName,
    );
    const manufacturerId = await this.manufacturerService.getManufacturerId(
      parseInt(row.ManufacturerID, 10),
      row.ManufacturerName,
    );

    const enhancedDescription = await this.descriptionEnhancer.enhanceDescription(
      row.ProductName,
      row.PrimaryCategoryName,
      row.ProductDescription,
    );

    const product = {
      docId,
      data: {
        name: row.ProductName,
        type: 'non-inventory',
        shortDescription: row.PriceDescription || '',
        description: enhancedDescription,
        vendorId,
        manufacturerId,
        storefrontPriceVisibility: 'members-only', 
        variants: [
          {
            id: nanoid(),
            available: row.Availability === 'Available',
            attributes: {
              packaging: row.PKG,
              description: row.ItemDescription || '',
            },
            cost: parseFloat(row.UnitPrice) || 0,
            currency: 'USD',
            description: row.ItemDescription || '',
            manufacturerItemCode: row.ManufacturerItemCode,
            manufacturerItemId: row.ManufacturerID,
            packaging: row.PKG,
            price: parseFloat(row.UnitPrice) * 1.2 || 0, 
            sku: `${row.ManufacturerItemCode}${row.PKG}`,
            active: true,
            images: [
              {
                fileName: row.ImageFileName || '',
                cdnLink: row.ItemImageURL || null,
                i: 0,
                alt: row.ProductName || null,
              },
            ],
            itemCode: row.NDCItemCode || '',
          },
        ],
      },
    };

    return product;
  }

  /**
   * Performs bulk upsert operations for a batch of products.
   * @param batch - An array of transformed product data.
   */
  async upsertBatch(batch: any[]) {
    const bulkOps = batch.map((product) => ({
      updateOne: {
        filter: { 'data.name': product.data.name },
        update: { $set: product },
        upsert: true,
      },
    }));

    try {
      await this.productModel.bulkWrite(bulkOps, { ordered: false });
      this.logger.log(`Upserted batch of ${batch.length} products.`);
    } catch (error) {
      this.logger.error(`Error upserting batch: ${error.message}`);
    }
  }

  /**
   * Handles deletions by flagging products not present in the current import.
   * @param importedProductIds - A set of ProductIDs that were imported.
   */
  async handleDeletions(importedProductIds: Set<string>) {
    this.logger.log('Handling deletions...');

    try {
      const productsToDelete = await this.productModel.find({
        'data.name': { $nin: Array.from(importedProductIds) },
        'data.isDeleted': { $ne: true },
      }).exec();

      for (const product of productsToDelete) {
        const hasOrders = await this.checkExistingOrders(product.id);
        if (!hasOrders) {
          product.data.isDeleted = true;
          await product.save();
          this.logger.log(`Product "${product.data.name}" flagged as deleted.`);
        } else {
          this.logger.warn(`Product "${product.data.name}" has existing orders and cannot be deleted.`);
        }
      }
    } catch (error) {
      this.logger.error(`Error handling deletions: ${error.message}`);
    }
  }

  /**
   * Checks if a product is associated with any existing orders.
   * @param productId - The MongoDB _id of the product.
   * @returns True if associated with orders, else false.
   */
  async checkExistingOrders(productId: string): Promise<boolean> {
    // Implement actual check against orders collection
    // For simulation, we'll return false
    return false;
  }
}
