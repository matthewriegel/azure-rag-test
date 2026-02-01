import { getOpenAIClient } from '../../lib/azure/openaiClient.js';
import { getSearchClient, SearchResult } from '../../lib/azure/searchClient.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

export interface RetrievalOptions {
  query: string;
  customerId?: string;
  topK?: number;
}

export interface RetrievalResult {
  results: SearchResult[];
  avgSimilarityScore: number;
  avgLexicalScore: number;
}

/**
 * Retrieve relevant documents using hybrid search
 */
export async function retrieveDocuments(options: RetrievalOptions): Promise<RetrievalResult> {
  const { query, customerId, topK = config.rag.searchTopK } = options;

  try {
    logger.info('Starting document retrieval', { query, customerId, topK });

    const openaiClient = getOpenAIClient();
    const searchClient = getSearchClient();

    // Generate query embedding
    const embeddings = await openaiClient.getEmbeddings(query);
    const queryVector = embeddings[0];

    // Build filter for customer-specific data
    const filter = customerId ? `customerId eq '${customerId}'` : undefined;

    // Perform hybrid search
    const results = await searchClient.hybridSearch({
      vector: queryVector,
      topK,
      filter,
    });

    // Calculate average scores
    const avgSimilarityScore =
      results.length > 0
        ? results.slice(0, 3).reduce((sum, r) => sum + r.score, 0) / Math.min(3, results.length)
        : 0;

    const avgLexicalScore =
      results.length > 0
        ? results.reduce((sum, r) => sum + (r.rerankerScore || r.score), 0) / results.length
        : 0;

    logger.info('Document retrieval completed', {
      resultsCount: results.length,
      avgSimilarityScore,
      avgLexicalScore,
    });

    return {
      results,
      avgSimilarityScore,
      avgLexicalScore,
    };
  } catch (error) {
    logger.error('Error during document retrieval', { error, query });
    throw new Error('Failed to retrieve documents');
  }
}

/**
 * Extract canonical data paths from search results
 */
export function extractDataPaths(results: SearchResult[]): string[] {
  const uniquePaths = new Set<string>();

  for (const result of results) {
    if (result.dataPath) {
      uniquePaths.add(result.dataPath);
    }
  }

  return Array.from(uniquePaths);
}
