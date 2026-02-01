import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple validation helper
function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  return value ? value === 'true' : defaultValue;
}

const config = {
  // Server
  nodeEnv: requireEnv('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  logLevel: requireEnv('LOG_LEVEL', 'info'),

  // Azure OpenAI
  azureOpenAI: {
    endpoint: requireEnv('AZURE_OPENAI_ENDPOINT'),
    apiKey: requireEnv('AZURE_OPENAI_API_KEY'),
    chatDeployment: requireEnv('AZURE_OPENAI_CHAT_DEPLOYMENT', 'gpt-4.1-mini'),
    embeddingDeployment: requireEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-3-large'),
    apiVersion: requireEnv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview'),
  },

  // Azure AI Search
  azureSearch: {
    endpoint: requireEnv('AZURE_SEARCH_ENDPOINT'),
    apiKey: requireEnv('AZURE_SEARCH_API_KEY'),
    indexName: requireEnv('AZURE_SEARCH_INDEX_NAME', 'rag-documents'),
  },

  // Azure Cache for Redis
  azureRedis: {
    host: requireEnv('AZURE_REDIS_HOST'),
    port: getEnvNumber('AZURE_REDIS_PORT', 6380),
    password: process.env.AZURE_REDIS_PASSWORD,
    cacheTtl: getEnvNumber('REDIS_CACHE_TTL', 3600),
  },

  // Azure Blob Storage
  azureStorage: {
    accountName: requireEnv('AZURE_STORAGE_ACCOUNT_NAME'),
    accountKey: requireEnv('AZURE_STORAGE_ACCOUNT_KEY'),
    containerName: requireEnv('AZURE_STORAGE_CONTAINER_NAME', 'customer-documents'),
  },

  // Azure Key Vault (optional)
  azureKeyVault: {
    url: process.env.AZURE_KEY_VAULT_URL,
  },

  // Application Insights (optional)
  applicationInsights: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },

  // Feature Flags
  features: {
    queryCache: getEnvBoolean('ENABLE_QUERY_CACHE', true),
    customerDataCache: getEnvBoolean('ENABLE_CUSTOMER_DATA_CACHE', true),
    telemetry: getEnvBoolean('ENABLE_TELEMETRY', true),
    piiRedaction: getEnvBoolean('ENABLE_PII_REDACTION', true),
  },

  // RAG Configuration
  rag: {
    chunkSize: getEnvNumber('CHUNK_SIZE', 500),
    chunkOverlap: getEnvNumber('CHUNK_OVERLAP', 100),
    searchTopK: getEnvNumber('SEARCH_TOP_K', 5),
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.5'),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },
};

export default config;
