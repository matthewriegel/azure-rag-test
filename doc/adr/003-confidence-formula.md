# ADR 003: Confidence Scoring Formula

**Status**: Accepted  
**Date**: 2026-01-20  
**Deciders**: Engineering Team

## Context

Users need to know how confident the RAG system is in its answers. We have three signals:
- Vector similarity (cosine distance)
- Lexical score (BM25 relevance)
- LLM self-assessment (model's own confidence)

## Decision

Use **weighted combination** with these weights:
```
final_confidence = 0.45 × similarity + 0.35 × lexical + 0.20 × llm
```

### Rationale
- **Similarity (45%)**: Most important - semantic relevance is key
- **Lexical (35%)**: Validates semantic match with keyword precision
- **LLM (20%)**: Useful but models can be overconfident

## Consequences

### Positive
- ✅ Multi-signal approach is more robust than single metric
- ✅ Weights are tunable via config
- ✅ Confidence correlates well with answer accuracy (80%+ for conf > 0.7)

### Negative
- ❌ Weights are heuristic-based, not ML-optimized
- ❌ May need calibration per use case
- ❌ LLM overconfidence can inflate scores

### Future Work
- A/B test alternative weight combinations
- Build labeled dataset for supervised calibration
- Consider domain-specific weight profiles

---

**Last updated**: 2026-02-01T15:46:00Z
