import { Injectable, Logger } from '@nestjs/common';
import { Configuration, OpenAIApi, CreateCompletionRequest } from 'openai';
import { ConfigService } from '@nestjs/config';
import { RateLimiter } from 'limiter';

@Injectable()
export class DescriptionEnhancerService {
  private readonly logger = new Logger(DescriptionEnhancerService.name);
  private openai: OpenAIApi;
  private limiter: RateLimiter;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>('OPENAI_MODEL') || 'text-davinci-003';

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not defined in environment variables.');
      throw new Error('OpenAI API key is required.');
    }

    const configuration = new Configuration({
      apiKey,
    });

    this.openai = new OpenAIApi(configuration);

    
    
    this.limiter = new RateLimiter({
      tokensPerInterval: 60, 
      interval: 'minute', 
      fireImmediately: false,
    });
  }

  /**
   * Enhances the product description using OpenAI's language model.
   * @param name - The name of the product.
   * @param category - The category of the product.
   * @param description - The existing description of the product (optional).
   * @returns The enhanced description.
   */
  async enhanceDescription(
    name: string,
    category: string,
    description?: string,
  ): Promise<string> {
    
    try {
      await this.limiter.removeTokens(1);
    } catch (error) {
      this.logger.error(`Rate limiter error: ${error.message}`);
      
    }

    const prompt = this.constructPrompt(name, category, description);

    const requestPayload: CreateCompletionRequest = {
      model: this.configService.get<string>('OPENAI_MODEL') || 'text-davinci-003',
      prompt,
      max_tokens: 150,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ['\n'],
    };

    try {
      const response = await this.openai.createCompletion(requestPayload);

      if (
        response.data &&
        response.data.choices &&
        response.data.choices.length > 0
      ) {
        const enhancedDescription = response.data.choices[0].text.trim();
        this.logger.debug(
          `Enhanced description for product "${name}" successfully.`,
        );
        return enhancedDescription;
      } else {
        this.logger.warn(
          `No description returned by OpenAI for product "${name}". Using existing description.`,
        );
        return description || '';
      }
    } catch (error: any) {
      this.logger.error(
        `Error enhancing description for product "${name}": ${error.message}`,
      );
      
      return description || '';
    }
  }

  /**
   * Constructs the prompt to send to OpenAI for description enhancement.
   * @param name - The name of the product.
   * @param category - The category of the product.
   * @param description - The existing description of the product (optional).
   * @returns The constructed prompt string.
   */
  private constructPrompt(
    name: string,
    category: string,
    description?: string,
  ): string {
    let basePrompt = `You are an expert in medical sales specializing in medical consumables used by hospitals daily. Enhance the product description based on the information provided.\n\nProduct name: ${name}\nCategory: ${category}\n`;

    if (description && description.trim() !== '') {
      basePrompt += `Product description: ${description}\n\nNew Description:`;
    } else {
      basePrompt += `\nNew Description:`;
    }

    return basePrompt;
  }
}
