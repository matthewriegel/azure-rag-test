import { getBlobClient } from '../../lib/azure/blobClient.js';
import { getSearchClient } from '../../lib/azure/searchClient.js';
import { getOpenAIClient } from '../../lib/azure/openaiClient.js';
import { getRedisClient } from '../../lib/azure/redisClient.js';
import { chunkText } from '../../utils/tokenizer.js';
import { hashString } from '../../utils/helpers.js';
import config from '../../config/env.js';
import { featureFlags } from '../../config/features.js';
import logger from '../../utils/logger.js';

export interface IngestOptions {
  customerId: string;
  forceReindex?: boolean;
}

export interface IngestResult {
  customerId: string;
  documentsProcessed: number;
  chunksCreated: number;
  success: boolean;
}

/**
 * Flatten nested customer data structure
 */
function flattenData(
  data: unknown,
  parentPath: string = '',
  result: Array<{ path: string; value: string }> = []
): Array<{ path: string; value: string }> {
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const path = parentPath ? `${parentPath}[${index}]` : `[${index}]`;
        flattenData(item, path, result);
      });
    } else {
      Object.entries(data).forEach(([key, value]) => {
        const path = parentPath ? `${parentPath}.${key}` : key;
        flattenData(value, path, result);
      });
    }
  } else if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    result.push({ path: parentPath, value: String(data) });
  }

  return result;
}

/**
 * Ingest customer data into the search index
 */
export async function ingestCustomerData(options: IngestOptions): Promise<IngestResult> {
  const { customerId, forceReindex = false } = options;

  try {
    logger.info('Starting data ingestion', { customerId });

    const blobClient = getBlobClient();
    const searchClient = getSearchClient();
    const openaiClient = getOpenAIClient();
    const redisClient = getRedisClient();

    // Ensure search index exists
    await searchClient.ensureIndex();

    // Check cache for existing data
    const cacheKey = `customer:${customerId}:data`;
    let customerData: unknown;

    if (featureFlags.customerDataCache && !forceReindex) {
      const cachedData = await redisClient.get<unknown>(cacheKey);
      if (cachedData) {
        customerData = cachedData;
        logger.info('Using cached customer data', { customerId });
      }
    }

    // Fetch from blob storage if not cached
    if (!customerData) {
      customerData = await blobClient.getCustomerData(customerId);

      // Cache customer data
      if (featureFlags.customerDataCache) {
        await redisClient.set(cacheKey, customerData, 86400); // 24 hours
      }
    }

    // Delete existing documents if force reindex
    if (forceReindex) {
      await searchClient.deleteByCustomerId(customerId);
      logger.info('Deleted existing documents for customer', { customerId });
    }

    // Flatten and chunk data
    const flattenedData = flattenData(customerData);
    logger.info('Flattened customer data', {
      customerId,
      fields: flattenedData.length,
    });

    const documents: Array<{
      id: string;
      content: string;
      contentVector: number[];
      dataPath: string;
      customerId: string;
      chunkId: string;
    }> = [];

    let totalChunks = 0;

    for (const { path, value } of flattenedData) {
      // Skip empty or very short values
      if (!value || value.length < 10) {
        continue;
      }

      // Chunk the content
      const chunks = chunkText(value, config.rag.chunkSize, config.rag.chunkOverlap);

      // Generate embeddings for all chunks
      const embeddings = await openaiClient.getEmbeddings(chunks);

      // Create documents for indexing
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${customerId}-${hashString(path)}-${i}`;
        documents.push({
          id: chunkId,
          content: chunks[i],
          contentVector: embeddings[i],
          dataPath: path,
          customerId,
          chunkId,
        });
        totalChunks++;
      }
    }

    // Index documents in batches
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await searchClient.indexDocuments(batch);
    }

    logger.info('Ingestion completed', {
      customerId,
      documentsProcessed: flattenedData.length,
      chunksCreated: totalChunks,
    });

    return {
      customerId,
      documentsProcessed: flattenedData.length,
      chunksCreated: totalChunks,
      success: true,
    };
  } catch (error) {
    logger.error('Error during ingestion', { error, customerId });
    throw new Error(`Failed to ingest data for customer ${customerId}`);
  }
}
