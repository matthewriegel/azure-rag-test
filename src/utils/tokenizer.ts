import { encoding_for_model } from 'tiktoken';

const encoder = encoding_for_model('gpt-4');

/**
 * Count tokens in text
 */
export function countTokens(text: string): number {
  return encoder.encode(text).length;
}

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const tokens = encoder.encode(text);
  const chunks: string[] = [];

  let start = 0;
  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    const decoded = new TextDecoder().decode(encoder.decode(chunkTokens));
    chunks.push(decoded);

    if (end === tokens.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Truncate text to max tokens
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const tokens = encoder.encode(text);
  if (tokens.length <= maxTokens) {
    return text;
  }
  const truncated = encoder.decode(tokens.slice(0, maxTokens));
  return new TextDecoder().decode(truncated);
}

/**
 * Clean up encoder resources
 */
export function cleanup(): void {
  encoder.free();
}
