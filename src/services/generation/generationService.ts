import { getOpenAIClient } from '../../lib/azure/openaiClient.js';
import { SearchResult } from '../../lib/azure/searchClient.js';
import logger from '../../utils/logger.js';

export interface GenerationOptions {
  question: string;
  context: SearchResult[];
}

export interface GenerationResult {
  answer: string;
  dataPath: string[];
  explanation: string;
  llmConfidence: number;
}

/**
 * Create prompt for structured response generation
 */
function createPrompt(question: string, context: SearchResult[]): string {
  const contextText = context
    .map((result, index) => {
      return `[${index + 1}] Data Path: ${result.dataPath}\nContent: ${result.content}\n`;
    })
    .join('\n');

  return `You are a helpful assistant answering questions about form data. Based on the provided context, answer the question accurately and concisely.

Context:
${contextText}

Question: ${question}

Provide your response in the following JSON format:
{
  "answer": "Your concise answer to the question",
  "dataPath": ["list", "of", "relevant", "data", "paths"],
  "explanation": "Brief explanation of your answer (1-2 sentences)",
  "confidence": 0.85
}

The confidence should be a number between 0 and 1 indicating how confident you are in your answer based on the available context.`;
}

/**
 * Generate answer using Azure OpenAI
 */
export async function generateAnswer(
  options: GenerationOptions
): Promise<GenerationResult> {
  const { question, context } = options;

  try {
    logger.info('Generating answer', { question, contextSize: context.length });

    const openaiClient = getOpenAIClient();

    // Create structured prompt
    const prompt = createPrompt(question, context);

    // Get structured response from LLM
    const response = await openaiClient.getStructuredCompletion<{
      answer: string;
      dataPath: string[];
      explanation: string;
      confidence: number;
    }>([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    logger.info('Answer generated', {
      answer: response.answer,
      dataPathCount: response.dataPath.length,
      llmConfidence: response.confidence,
    });

    return {
      answer: response.answer,
      dataPath: response.dataPath,
      explanation: response.explanation,
      llmConfidence: response.confidence,
    };
  } catch (error) {
    logger.error('Error generating answer', { error, question });
    throw new Error('Failed to generate answer');
  }
}

/**
 * Validate generated answer
 */
export function validateAnswer(result: GenerationResult): boolean {
  return (
    result.answer.length > 0 &&
    result.dataPath.length > 0 &&
    result.explanation.length > 0 &&
    result.llmConfidence >= 0 &&
    result.llmConfidence <= 1
  );
}
