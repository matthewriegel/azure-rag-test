import { hashString, normalizeQuery, createCacheKey, redactPII } from '../utils/helpers.js';

describe('Helpers', () => {
  describe('hashString', () => {
    it('should create consistent hashes', () => {
      const input = 'test string';
      const hash1 = hashString(input);
      const hash2 = hashString(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex
    });

    it('should create different hashes for different inputs', () => {
      const hash1 = hashString('input1');
      const hash2 = hashString('input2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('normalizeQuery', () => {
    it('should normalize query text', () => {
      const query = '  What IS  the Customer Email?  ';
      const normalized = normalizeQuery(query);

      expect(normalized).toBe('what is the customer email');
    });

    it('should remove special characters', () => {
      const query = "What's the customer's email?";
      const normalized = normalizeQuery(query);

      expect(normalized).not.toContain("'");
      expect(normalized).not.toContain('?');
    });
  });

  describe('createCacheKey', () => {
    it('should create cache key with query only', () => {
      const key = createCacheKey('what is email');

      expect(key).toContain('query:');
    });

    it('should create cache key with customer ID', () => {
      const key = createCacheKey('what is email', 'customer-123');

      expect(key).toContain('query:');
    });

    it('should create consistent keys for same input', () => {
      const key1 = createCacheKey('what is email', 'customer-123');
      const key2 = createCacheKey('what is email', 'customer-123');

      expect(key1).toBe(key2);
    });
  });

  describe('redactPII', () => {
    it('should redact email addresses', () => {
      const text = 'Contact john.doe@example.com for more info';
      const redacted = redactPII(text);

      expect(redacted).toContain('[EMAIL]');
      expect(redacted).not.toContain('john.doe@example.com');
    });

    it('should redact phone numbers', () => {
      const text = 'Call 555-123-4567 for support';
      const redacted = redactPII(text);

      expect(redacted).toContain('[PHONE]');
      expect(redacted).not.toContain('555-123-4567');
    });

    it('should redact SSN', () => {
      const text = 'SSN: 123-45-6789';
      const redacted = redactPII(text);

      expect(redacted).toContain('[SSN]');
      expect(redacted).not.toContain('123-45-6789');
    });

    it('should handle text without PII', () => {
      const text = 'This is a normal text';
      const redacted = redactPII(text);

      expect(redacted).toBe(text);
    });
  });
});
