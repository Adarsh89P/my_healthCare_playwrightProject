import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '@ai/config';
import { extractJson, isRecord } from '@ai/parse';
import { AiResult } from '@ai/types';
import { logger } from '@core/utils/logger';

/**
 * Thin wrapper around the Anthropic Messages API.
 *
 * The contract every caller relies on: this never throws and never rejects.
 * Missing key, disabled flag, network error, timeout, safety refusal or an
 * unparseable response all come back as `{ ok: false, reason }`, so an AI
 * failure can never fail a test.
 */

let cachedClient: Anthropic | undefined;

function getClient(): Anthropic | undefined {
  const apiKey = aiConfig.apiKey;
  if (!apiKey) return undefined;
  cachedClient ??= new Anthropic({ apiKey, timeout: aiConfig.timeoutMs, maxRetries: 1 });
  return cachedClient;
}

/** Exposed for tests, which need a clean client between cases. */
export function resetClient(): void {
  cachedClient = undefined;
}

export interface JsonRequest {
  system: string;
  prompt: string;
  /** JSON Schema the response must conform to. */
  schema: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Asks the model for a JSON object matching `schema`.
 *
 * Uses structured outputs so the response is constrained server-side rather
 * than hoped for, but still parses defensively — a schema is a strong
 * guarantee, not an excuse to skip validation.
 */
export async function askForJson(request: JsonRequest): Promise<AiResult<Record<string, unknown>>> {
  if (!aiConfig.enabled) {
    return { ok: false, reason: aiConfig.apiKey ? 'disabled' : 'no-api-key' };
  }

  const client = getClient();
  if (!client) return { ok: false, reason: 'no-api-key' };

  try {
    const response = await client.messages.create({
      model: aiConfig.model,
      max_tokens: request.maxTokens ?? aiConfig.maxTokens,
      system: request.system,
      messages: [{ role: 'user', content: request.prompt }],
      output_config: {
        effort: aiConfig.effort,
        format: { type: 'json_schema', schema: request.schema },
      },
    });

    // Safety classifiers can decline a request; that arrives as a normal 200.
    if (response.stop_reason === 'refusal') {
      logger.warn('AI request declined by safety classifiers - continuing without AI');
      return { ok: false, reason: 'refused' };
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    const parsed = extractJson(text);
    if (!parsed.ok) return parsed;

    if (!isRecord(parsed.data)) {
      return { ok: false, reason: 'invalid-shape', detail: 'response was not a JSON object' };
    }

    return { ok: true, data: parsed.data };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const reason = /timeout|aborted|ETIMEDOUT/i.test(detail) ? 'timeout' : 'api-error';
    logger.warn(`AI request failed (${reason}) - continuing without AI`, { detail });
    return { ok: false, reason, detail };
  }
}

/** Human-readable explanation of why AI produced nothing, for reports. */
export function describeSkip(reason: string): string {
  const messages: Record<string, string> = {
    disabled: 'AI layer disabled (set AI_ENABLED=true to turn it on).',
    'no-api-key': 'ANTHROPIC_API_KEY is not set.',
    refused: 'The request was declined by safety classifiers.',
    timeout: 'The AI request timed out.',
    'api-error': 'The AI request failed.',
    'parse-error': 'The AI response could not be parsed as JSON.',
    'invalid-shape': 'The AI response did not match the expected shape.',
  };
  return messages[reason] ?? 'AI produced no result.';
}
