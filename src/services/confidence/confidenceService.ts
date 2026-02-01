import config from '../../config/env.js';
import logger from '../../utils/logger.js';

export interface ConfidenceInputs {
  avgSimilarityScore: number; // Average similarity of top-3 search hits
  avgLexicalScore: number; // BM25 relevance score normalized
  llmScore: number; // Model self-score (0..1)
}

export interface ConfidenceResult {
  finalConfidence: number;
  components: {
    similarity: number;
    lexical: number;
    llm: number;
  };
  weights: {
    similarity: number;
    lexical: number;
    llm: number;
  };
}

// Confidence weights as per requirements
const CONFIDENCE_WEIGHTS = {
  similarity: 0.45,
  lexical: 0.35,
  llm: 0.20,
};

/**
 * Normalize score to 0..1 range
 */
function normalizeScore(score: number, min: number = 0, max: number = 1): number {
  return Math.max(0, Math.min(1, (score - min) / (max - min)));
}

/**
 * Calculate final confidence score using weighted signals
 */
export function calculateConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  const { avgSimilarityScore, avgLexicalScore, llmScore } = inputs;

  // Normalize scores to 0..1 range
  // Similarity scores from Azure Search are typically 0..1 for cosine similarity
  const normalizedSimilarity = normalizeScore(avgSimilarityScore, 0, 1);

  // Lexical/BM25 scores need normalization (typically 0..100 from Azure Search)
  const normalizedLexical = normalizeScore(avgLexicalScore, 0, 100);

  // LLM score should already be 0..1
  const normalizedLLM = normalizeScore(llmScore, 0, 1);

  // Calculate weighted confidence
  const finalConfidence =
    CONFIDENCE_WEIGHTS.similarity * normalizedSimilarity +
    CONFIDENCE_WEIGHTS.lexical * normalizedLexical +
    CONFIDENCE_WEIGHTS.llm * normalizedLLM;

  const result: ConfidenceResult = {
    finalConfidence: Math.round(finalConfidence * 100) / 100, // Round to 2 decimals
    components: {
      similarity: Math.round(normalizedSimilarity * 100) / 100,
      lexical: Math.round(normalizedLexical * 100) / 100,
      llm: Math.round(normalizedLLM * 100) / 100,
    },
    weights: CONFIDENCE_WEIGHTS,
  };

  logger.info('Confidence calculated', {
    finalConfidence: result.finalConfidence,
    components: result.components,
  });

  return result;
}

/**
 * Check if confidence meets threshold
 */
export function meetsConfidenceThreshold(confidence: number): boolean {
  return confidence >= config.rag.confidenceThreshold;
}
