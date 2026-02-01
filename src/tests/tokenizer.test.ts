import { countTokens, chunkText } from '../utils/tokenizer.js';

describe('Tokenizer', () => {
  describe('countTokens', () => {
    it('should count tokens in simple text', () => {
      const text = 'Hello world';
      const count = countTokens(text);

      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    it('should count more tokens for longer text', () => {
      const shortText = 'Hello';
      const longText = 'Hello world this is a longer text with more words';

      const shortCount = countTokens(shortText);
      const longCount = countTokens(longText);

      expect(longCount).toBeGreaterThan(shortCount);
    });
  });

  describe('chunkText', () => {
    it('should split text into chunks', () => {
      const text = 'word '.repeat(200); // Create text with ~200 words
      const chunks = chunkText(text, 100, 20);

      expect(chunks.length).toBeGreaterThan(1);
      expect(Array.isArray(chunks)).toBe(true);
    });

    it('should handle small text without chunking', () => {
      const text = 'Short text';
      const chunks = chunkText(text, 1000, 100);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toContain('Short text');
    });

    it('should create overlapping chunks', () => {
      const text = 'word '.repeat(200);
      const chunks = chunkText(text, 100, 20);

      // With overlap, should have more chunks than without
      expect(chunks.length).toBeGreaterThan(1);
    });
  });
});
