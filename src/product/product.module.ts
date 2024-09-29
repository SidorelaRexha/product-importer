
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductSchema } from '../schemas/product.schema';
import { VendorSchema } from '../schemas/vendor.schema';
import { ManufacturerSchema } from '../schemas/manufacturer.schema';
import { ProductService } from './product.service';
import { VendorService } from './vendor.service';
import { ManufacturerService } from './manufacturer.service';
import { DescriptionEnhancerService } from './description-enhancer.service';
import { ImportController } from './import.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Product', schema: ProductSchema },
      { name: 'Vendor', schema: VendorSchema },
      { name: 'Manufacturer', schema: ManufacturerSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    ProductService,
    VendorService,
    ManufacturerService,
    DescriptionEnhancerService,
  ],
  controllers: [ImportController],
})
export class ProductModule {}
