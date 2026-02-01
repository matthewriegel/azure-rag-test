import { getRedisClient } from '../lib/azure/redisClient.js';
import { retrieveDocuments, extractDataPaths } from './retrieval/index.js';
import { generateAnswer } from './generation/index.js';
import { calculateConfidence } from './confidence/index.js';
import { ingestCustomerData } from './ingest/index.js';
import { createCacheKey, normalizeQuery } from '../utils/helpers.js';
import { featureFlags } from '../config/features.js';
import logger from '../utils/logger.js';

export interface FormQueryRequest {
  formQuestion: string;
  customerId?: string;
}

export interface FormQueryResponse {
  answer: string;
  dataPath: string[];
  confidence: number;
  sources: Array<{
    dataPath: string;
    score: number;
  }>;
  cached: boolean;
}

/**
 * Main RAG pipeline for form query processing
 */
export async function processFormQuery(request: FormQueryRequest): Promise<FormQueryResponse> {
  const { formQuestion, customerId } = request;

  try {
    logger.info('Processing form query', { formQuestion, customerId });

    // Step 1: Normalize and hash query → Redis lookup
    const normalizedQuery = normalizeQuery(formQuestion);
    const cacheKey = createCacheKey(normalizedQuery, customerId);

    // Check cache
    if (featureFlags.queryCache) {
      const redisClient = getRedisClient();
      const cachedResult = await redisClient.get<FormQueryResponse>(cacheKey);

      if (cachedResult) {
        logger.info('Cache hit', { cacheKey });
        return {
          ...cachedResult,
          cached: true,
        };
      }
    }

    logger.info('Cache miss, processing query', { cacheKey });

    // Step 2: Ensure customer data is indexed (if customerId provided)
    if (customerId) {
      // Check if customer data is already indexed by trying a test search
      const redisClient = getRedisClient();
      const indexedCacheKey = `customer:${customerId}:indexed`;
      
      const isIndexed = await redisClient.exists(indexedCacheKey);
      
      if (!isIndexed) {
        // This will check cache or fetch + index from blob storage
        await ingestCustomerData({ customerId, forceReindex: false });
        // Mark as indexed (cache for 24 hours)
        await redisClient.set(indexedCacheKey, { indexed: true }, 86400);
      }
    }

    // Step 3: Execute hybrid vector search
    const retrievalResult = await retrieveDocuments({
      query: formQuestion,
      customerId,
    });

    if (retrievalResult.results.length === 0) {
      logger.warn('No search results found', { formQuestion, customerId });
      return {
        answer: 'No relevant information found.',
        dataPath: [],
        confidence: 0,
        sources: [],
        cached: false,
      };
    }

    // Step 4: Extract canonical data paths
    const dataPaths = extractDataPaths(retrievalResult.results);

    // Step 5: Call Azure OpenAI for structured response
    const generationResult = await generateAnswer({
      question: formQuestion,
      context: retrievalResult.results,
    });

    // Step 6: Compute final confidence
    const confidenceResult = calculateConfidence({
      avgSimilarityScore: retrievalResult.avgSimilarityScore,
      avgLexicalScore: retrievalResult.avgLexicalScore,
      llmScore: generationResult.llmConfidence,
    });

    // Step 7: Build response
    const response: FormQueryResponse = {
      answer: generationResult.answer,
      dataPath: generationResult.dataPath.length > 0 ? generationResult.dataPath : dataPaths,
      confidence: confidenceResult.finalConfidence,
      sources: retrievalResult.results.slice(0, 5).map((result) => ({
        dataPath: result.dataPath,
        score: result.score,
      })),
      cached: false,
    };

    // Step 8: Cache final response
    if (featureFlags.queryCache) {
      const redisClient = getRedisClient();
      await redisClient.set(cacheKey, response);
      logger.info('Response cached', { cacheKey });
    }

    logger.info('Form query processed successfully', {
      confidence: response.confidence,
      sourcesCount: response.sources.length,
    });

    return response;
  } catch (error) {
    logger.error('Error processing form query', { error, formQuestion, customerId });
    throw new Error('Failed to process form query');
  }
}
