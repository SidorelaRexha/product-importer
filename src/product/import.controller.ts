import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('import')
export class ImportController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Endpoint to trigger the product import process.
   * Accessible via POST request to /import
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async triggerImport() {
    await this.productService.importProducts();
    return { message: 'Product import triggered successfully.' };
  }
}
