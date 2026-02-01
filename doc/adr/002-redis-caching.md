# ADR 002: Redis Caching Pattern

**Status**: Accepted  
**Date**: 2026-01-15  
**Deciders**: Engineering Team

## Context

RAG queries are computationally expensive (embeddings + search + LLM). We need caching to:
- Reduce latency for repeat queries
- Lower Azure OpenAI costs (token usage)
- Improve UX with faster responses

## Decision

Implement **two-level Redis caching**:
1. **Query cache**: Hash(normalized_query + customerId) → result (TTL: 1 hour)
2. **Customer data cache**: customerId → blob data (TTL: 24 hours)

## Consequences

### Positive
- ✅ 80%+ cache hit rate for common queries
- ✅ Reduced Azure OpenAI costs (fewer embedding/chat calls)
- ✅ Sub-100ms response for cached queries
- ✅ Azure Cache for Redis is managed and reliable

### Negative
- ❌ Stale data risk if blob storage updated (24h TTL)
- ❌ Additional cost for Redis ($15-100/mo)
- ❌ Cache invalidation complexity

### Mitigations
- Query cache short TTL (1h) balances freshness and cost
- Force reindex flag in ingest API clears customer cache
- Monitor cache hit ratio in Application Insights

---

**Last updated**: 2026-02-01T15:45:00Z
