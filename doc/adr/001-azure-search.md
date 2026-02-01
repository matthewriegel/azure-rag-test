# ADR 001: Azure AI Search for Vector Storage

**Status**: Accepted  
**Date**: 2026-01-15  
**Deciders**: Engineering Team

## Context

We need a vector database to store and search document embeddings for RAG. Requirements:
- Hybrid search (vector + lexical/BM25)
- Azure-native integration
- Scalability and production-readiness
- Managed service (low operational overhead)

## Decision

Use **Azure AI Search** as the vector store.

## Consequences

### Positive
- ✅ Native Azure integration with OpenAI, Storage, and Redis
- ✅ Built-in hybrid search combining vector and BM25 scores
- ✅ Fully managed with auto-scaling and HA
- ✅ No separate infrastructure for lexical search
- ✅ Strong security and compliance (Azure AD, RBAC, encryption)

### Negative
- ❌ Azure vendor lock-in (migration to Pinecone/Weaviate requires code changes)
- ❌ Cost higher than self-hosted solutions
- ❌ Limited customization vs open-source alternatives

### Alternatives Considered
- **Pinecone**: Better for pure vector search but lacks native BM25
- **Weaviate**: More flexible but requires self-hosting or separate managed service
- **PostgreSQL + pgvector**: Lower cost but worse performance at scale

---

**Last updated**: 2026-02-01T15:44:00Z
