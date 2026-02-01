import { SearchClient, SearchIndexClient, AzureKeyCredential } from '@azure/search-documents';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

export interface SearchResult {
  id: string;
  content: string;
  dataPath: string;
  customerId?: string;
  score: number;
  rerankerScore?: number;
}

export interface VectorSearchOptions {
  vector: number[];
  topK?: number;
  filter?: string;
}

class AzureSearchService {
  private searchClient: SearchClient<Record<string, unknown>>;
  private indexClient: SearchIndexClient;
  private indexName: string;

  constructor() {
    const credential = new AzureKeyCredential(config.azureSearch.apiKey);
    this.indexName = config.azureSearch.indexName;

    this.searchClient = new SearchClient(config.azureSearch.endpoint, this.indexName, credential);

    this.indexClient = new SearchIndexClient(config.azureSearch.endpoint, credential);

    logger.info('Azure AI Search client initialized');
  }

  /**
   * Initialize search index with vector configuration
   */
  async ensureIndex(): Promise<void> {
    try {
      const indexExists = await this.indexExists();

      if (!indexExists) {
        await this.createIndex();
        logger.info(`Created search index: ${this.indexName}`);
      }
    } catch (error) {
      logger.error('Error ensuring index exists', { error });
      throw error;
    }
  }

  /**
   * Check if index exists
   */
  private async indexExists(): Promise<boolean> {
    try {
      await this.indexClient.getIndex(this.indexName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create search index with vector fields
   */
  private async createIndex(): Promise<void> {
    const indexDefinition = {
      name: this.indexName,
      fields: [
        {
          name: 'id',
          type: 'Edm.String' as const,
          key: true,
          filterable: true,
        },
        {
          name: 'content',
          type: 'Edm.String' as const,
          searchable: true,
          analyzer: 'en.microsoft',
        },
        {
          name: 'contentVector',
          type: 'Collection(Edm.Single)' as const,
          searchable: true,
          vectorSearchDimensions: 3072, // text-embedding-3-large
          vectorSearchProfileName: 'default-vector-profile',
        },
        {
          name: 'dataPath',
          type: 'Edm.String' as const,
          searchable: true,
          filterable: true,
        },
        {
          name: 'customerId',
          type: 'Edm.String' as const,
          filterable: true,
        },
        {
          name: 'chunkId',
          type: 'Edm.String' as const,
          filterable: true,
        },
      ],
      vectorSearch: {
        profiles: [
          {
            name: 'default-vector-profile',
            algorithm: 'default-algorithm',
          },
        ],
        algorithms: [
          {
            name: 'default-algorithm',
            kind: 'hnsw',
          },
        ],
      },
    };

    await this.indexClient.createIndex(indexDefinition as never);
  }

  /**
   * Index documents with embeddings
   */
  async indexDocuments(
    documents: Array<{
      id: string;
      content: string;
      contentVector: number[];
      dataPath: string;
      customerId?: string;
      chunkId: string;
    }>
  ): Promise<void> {
    try {
      await this.searchClient.uploadDocuments(documents);
      logger.info(`Indexed ${documents.length} documents`);
    } catch (error) {
      logger.error('Error indexing documents', { error });
      throw new Error('Failed to index documents');
    }
  }

  /**
   * Perform hybrid search (vector + BM25)
   */
  async hybridSearch(options: VectorSearchOptions): Promise<SearchResult[]> {
    try {
      const { vector, topK = config.rag.searchTopK, filter } = options;

      const searchResults = await this.searchClient.search('*', {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector,
              kNearestNeighborsCount: topK,
              fields: ['contentVector'],
            },
          ],
        },
        select: ['id', 'content', 'dataPath', 'customerId'],
        top: topK,
        filter,
      });

      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        results.push({
          id: result.document.id as string,
          content: result.document.content as string,
          dataPath: result.document.dataPath as string,
          customerId: result.document.customerId as string | undefined,
          score: result.score || 0,
          rerankerScore: result.rerankerScore,
        });
      }

      logger.info(`Hybrid search returned ${results.length} results`);
      return results;
    } catch (error) {
      logger.error('Error performing hybrid search', { error });
      throw new Error('Failed to perform search');
    }
  }

  /**
   * Delete documents by customer ID
   */
  async deleteByCustomerId(customerId: string): Promise<void> {
    try {
      const searchResults = await this.searchClient.search('*', {
        filter: `customerId eq '${customerId}'`,
        select: ['id'],
      });

      const documentIds: string[] = [];
      for await (const result of searchResults.results) {
        documentIds.push(result.document.id as string);
      }

      if (documentIds.length > 0) {
        await this.searchClient.deleteDocuments(documentIds.map((id) => ({ id })));
        logger.info(`Deleted ${documentIds.length} documents for customer ${customerId}`);
      }
    } catch (error) {
      logger.error('Error deleting documents', { error, customerId });
      throw new Error('Failed to delete documents');
    }
  }
}

// Singleton instance
let searchService: AzureSearchService | null = null;

export function getSearchClient(): AzureSearchService {
  if (!searchService) {
    searchService = new AzureSearchService();
  }
  return searchService;
}

export default getSearchClient;
