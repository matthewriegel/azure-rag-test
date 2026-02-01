import { calculateConfidence } from '../services/confidence/confidenceService.js';

describe('Confidence Service', () => {
  describe('calculateConfidence', () => {
    it('should calculate confidence with all inputs', () => {
      const result = calculateConfidence({
        avgSimilarityScore: 0.9,
        avgLexicalScore: 80,
        llmScore: 0.85,
      });

      expect(result.finalConfidence).toBeGreaterThan(0);
      expect(result.finalConfidence).toBeLessThanOrEqual(1);
      expect(result.components).toBeDefined();
      expect(result.weights).toBeDefined();
    });

    it('should apply correct weights', () => {
      const result = calculateConfidence({
        avgSimilarityScore: 1.0,
        avgLexicalScore: 100,
        llmScore: 1.0,
      });

      // All perfect scores should give high confidence
      expect(result.finalConfidence).toBeGreaterThan(0.9);
    });

    it('should handle low scores', () => {
      const result = calculateConfidence({
        avgSimilarityScore: 0.1,
        avgLexicalScore: 10,
        llmScore: 0.1,
      });

      // Low scores should give low confidence
      expect(result.finalConfidence).toBeLessThan(0.3);
    });

    it('should normalize scores correctly', () => {
      const result = calculateConfidence({
        avgSimilarityScore: 0.5,
        avgLexicalScore: 50,
        llmScore: 0.5,
      });

      expect(result.components.similarity).toBe(0.5);
      expect(result.components.lexical).toBe(0.5);
      expect(result.components.llm).toBe(0.5);
    });
  });
});
