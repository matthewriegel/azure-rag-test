import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

class AzureOpenAIService {
  private client: OpenAIClient;
  private chatDeployment: string;
  private embeddingDeployment: string;

  constructor() {
    this.client = new OpenAIClient(
      config.azureOpenAI.endpoint,
      new AzureKeyCredential(config.azureOpenAI.apiKey)
    );
    this.chatDeployment = config.azureOpenAI.chatDeployment;
    this.embeddingDeployment = config.azureOpenAI.embeddingDeployment;
    logger.info('Azure OpenAI client initialized');
  }

  /**
   * Generate embeddings for text
   */
  async getEmbeddings(text: string | string[]): Promise<number[][]> {
    try {
      const inputs = Array.isArray(text) ? text : [text];
      const response = await this.client.getEmbeddings(this.embeddingDeployment, inputs);
      
      return response.data.map((item) => item.embedding);
    } catch (error) {
      logger.error('Error generating embeddings', { error });
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Generate chat completion
   */
  async getChatCompletion(messages: Array<{ role: string; content: string }>): Promise<{
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    try {
      const response = await this.client.getChatCompletions(this.chatDeployment, messages);
      
      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response from OpenAI');
      }

      return {
        content: choice.message.content || '',
        usage: response.usage
          ? {
              promptTokens: response.usage.promptTokens,
              completionTokens: response.usage.completionTokens,
              totalTokens: response.usage.totalTokens,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Error generating chat completion', { error });
      throw new Error('Failed to generate chat completion');
    }
  }

  /**
   * Generate structured JSON response
   */
  async getStructuredCompletion<T>(
    messages: Array<{ role: string; content: string }>,
    schema?: Record<string, unknown>
  ): Promise<T> {
    try {
      const systemPrompt = schema
        ? `You must respond with valid JSON matching this schema: ${JSON.stringify(schema)}`
        : 'You must respond with valid JSON only, no additional text.';

      const enhancedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ];

      const response = await this.getChatCompletion(enhancedMessages);
      return JSON.parse(response.content) as T;
    } catch (error) {
      logger.error('Error generating structured completion', { error });
      throw new Error('Failed to generate structured completion');
    }
  }
}

// Singleton instance
let openAIService: AzureOpenAIService | null = null;

export function getOpenAIClient(): AzureOpenAIService {
  if (!openAIService) {
    openAIService = new AzureOpenAIService();
  }
  return openAIService;
}

export default getOpenAIClient;
