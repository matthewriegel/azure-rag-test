# Azure RAG Backend

Production-grade Retrieval-Augmented Generation (RAG) backend built with Node.js, TypeScript, Express, and Azure services.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Application                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Express API Server  │
              │   (Node.js + TS)      │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────────┐ ┌──────────┐ ┌──────────────┐
│ Azure OpenAI   │ │  Azure   │ │ Azure Blob   │
│ - Chat (GPT-4) │ │  AI      │ │   Storage    │
│ - Embeddings   │ │  Search  │ │ (Customers)  │
└────────────────┘ └──────────┘ └──────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Azure Redis     │
                │ (Cache)         │
                └─────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ App Insights    │
                │ (Monitoring)    │
                └─────────────────┘
```

## Features

- **Hybrid Vector Search**: Combines BM25 and vector similarity for optimal retrieval
- **Intelligent Caching**: Redis-based query and customer data caching
- **Confidence Scoring**: Multi-signal confidence calculation (similarity + lexical + LLM)
- **PII Redaction**: Built-in PII detection and redaction
- **Production Ready**: Rate limiting, error handling, logging, monitoring
- **Azure First**: Native integration with Azure services
- **Type Safe**: Full TypeScript with strict mode
- **Scalable**: Designed for production workloads

## Azure Services Used

| Service | Purpose | Cost (est.) |
|---------|---------|-------------|
| **Azure OpenAI** | Chat completions & embeddings | ~$50-100/mo |
| **Azure AI Search** | Vector + hybrid search | ~$75-250/mo |
| **Azure Cache for Redis** | Query/data caching | ~$15-100/mo |
| **Azure Blob Storage** | Customer document storage | ~$5-20/mo |
| **Azure Key Vault** | Secrets management | ~$5/mo |
| **Application Insights** | Monitoring & logging | ~$10-50/mo |

**Total Monthly Cost**: $160-525 (varies by usage and tier)

## Project Structure

```
.
├── src/
│   ├── config/           # Configuration and env management
│   │   ├── env.ts
│   │   └── features.ts
│   ├── lib/azure/        # Azure client wrappers
│   │   ├── openaiClient.ts
│   │   ├── searchClient.ts
│   │   ├── redisClient.ts
│   │   └── blobClient.ts
│   ├── services/         # Business logic
│   │   ├── ingest/       # Document ingestion
│   │   ├── retrieval/    # Vector search
│   │   ├── confidence/   # Confidence calculation
│   │   └── generation/   # LLM answer generation
│   ├── api/              # Express API layer
│   │   ├── app.ts
│   │   ├── routes.ts
│   │   ├── formQuery.ts
│   │   ├── ingest.ts
│   │   └── health.ts
│   ├── utils/            # Helpers and utilities
│   └── index.ts          # Server entry point
├── infra/                # Azure infrastructure (Bicep)
│   └── bicep/
│       ├── main.bicep
│       └── modules/
├── docker-compose.yml    # Local development
├── Dockerfile            # Production container
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Azure subscription
- Azure CLI (for deployment)

### Local Development

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd azure-rag-backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Azure credentials
   ```

3. **Start local services**:
   ```bash
   docker-compose up -d
   ```

4. **Run the API**:
   ```bash
   npm run dev
   ```

5. **Test the API**:
   ```bash
   curl http://localhost:3000/health
   ```

### Environment Variables

See `.env.example` for all configuration options. Key variables:

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4.1-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your-key

# Azure Cache for Redis
AZURE_REDIS_HOST=your-redis.redis.cache.windows.net
AZURE_REDIS_PORT=6380
AZURE_REDIS_PASSWORD=your-password

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
AZURE_STORAGE_ACCOUNT_KEY=your-key
```

## API Endpoints

### POST /api/form-query

Process a form question and return an answer with confidence score.

**Request**:
```json
{
  "formQuestion": "What is the customer's email address?",
  "customerId": "customer-123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "answer": "john.doe@example.com",
    "dataPath": ["contact.email"],
    "confidence": 0.92,
    "sources": [
      {
        "dataPath": "contact.email",
        "score": 0.95
      }
    ],
    "cached": false
  }
}
```

### POST /api/ingest

Ingest customer data into the search index (requires API key).

**Headers**:
```
X-API-Key: your-api-key
```

**Request**:
```json
{
  "customerId": "customer-123",
  "forceReindex": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "customerId": "customer-123",
    "documentsProcessed": 45,
    "chunksCreated": 120,
    "success": true
  }
}
```

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "redis": "ok",
    "search": "ok"
  }
}
```

## RAG Pipeline Flow

1. **Receive Query**: `POST /api/form-query`
2. **Normalize & Cache Check**: Hash query → Redis lookup
3. **Cache Miss Processing**:
   - Fetch customer data from Blob Storage
   - Chunk data (500 tokens, 100 overlap)
   - Generate embeddings
   - Index in Azure AI Search
4. **Hybrid Search**: Vector + BM25 (top K=5)
5. **Generate Answer**: Call GPT-4 with context
6. **Calculate Confidence**:
   - `final = 0.45 * sim_score + 0.35 * lexical_score + 0.20 * llm_score`
7. **Cache & Return**: Store in Redis, return response

## Confidence Calculation

The system uses a weighted multi-signal approach:

- **Similarity Score (45%)**: Average cosine similarity of top-3 search results
- **Lexical Score (35%)**: BM25 relevance score (normalized)
- **LLM Score (20%)**: Model's self-assessed confidence

```typescript
finalConfidence = 
  0.45 * avgSimilarityScore +
  0.35 * avgLexicalScore +
  0.20 * llmSelfScore
```

## Deployment to Azure

### 1. Deploy Infrastructure

```bash
# Create resource group
az group create --name rg-rag-backend --location eastus

# Deploy Bicep template
az deployment group create \
  --resource-group rg-rag-backend \
  --template-file infra/bicep/main.bicep \
  --parameters environment=prod

# Get outputs
az deployment group show \
  --resource-group rg-rag-backend \
  --name main \
  --query properties.outputs
```

### 2. Build and Push Container

```bash
# Build Docker image
docker build -t ragbackend:latest .

# Tag for Azure Container Registry
docker tag ragbackend:latest <your-acr>.azurecr.io/ragbackend:latest

# Push to ACR
az acr login --name <your-acr>
docker push <your-acr>.azurecr.io/ragbackend:latest
```

### 3. Deploy to Container Apps

Update the Container App with your image or use the Azure Portal.

## Development

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
npm run lint:fix
```

### Format

```bash
npm run format
npm run format:check
```

### Test

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Scaling Strategies

### Horizontal Scaling
- **Container Apps**: Auto-scale based on HTTP requests (1-10 replicas)
- **Redis**: Use cluster mode for production
- **AI Search**: Increase replicas and partitions

### Vertical Scaling
- **OpenAI**: Increase TPM quotas
- **Redis**: Upgrade to Premium tier
- **Search**: Move to Standard/Premium tiers

### Caching Optimization
- Query cache TTL: 1 hour (configurable)
- Customer data cache: 24 hours
- Implement cache warming for frequent queries

### Cost Optimization
- Use Basic tiers for dev/staging
- Enable auto-pause for non-production
- Monitor and optimize token usage
- Implement request batching

## Security

- **No secrets in code**: All credentials via environment variables
- **PII redaction**: Automatic detection and redaction
- **Rate limiting**: 100 requests/minute per IP
- **TLS encryption**: All Azure services use TLS 1.2+
- **API key authentication**: Required for /ingest endpoint
- **RBAC**: Use Azure managed identities in production

## Monitoring

### Application Insights
- Request tracking and performance
- Dependency tracking (OpenAI, Redis, Search)
- Custom metrics and events
- Distributed tracing

### Key Metrics
- Request latency (p50, p95, p99)
- Error rate
- Cache hit ratio
- OpenAI token usage
- Search query performance

### Alerts
- High error rate (>5%)
- High latency (>2s p95)
- Service health degradation
- Cost anomalies

## Troubleshooting

### Redis Connection Issues
```bash
# Test Redis connection
redis-cli -h <host> -p 6380 --tls -a <password> ping
```

### Search Index Issues
```bash
# Verify index exists
az search index show --service-name <name> --name rag-documents
```

### OpenAI Rate Limits
- Check TPM quotas in Azure Portal
- Implement exponential backoff
- Consider request batching

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run linting and tests
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Create an issue in the repository
- Check Azure service health status
- Review Application Insights logs