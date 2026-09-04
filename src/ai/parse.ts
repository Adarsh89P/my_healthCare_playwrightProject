import { AiResult } from '@ai/types';

/**
 * Pure parsing + validation helpers.
 *
 * Deliberately free of any network or SDK dependency so the fallback behaviour
 * can be unit-tested exhaustively — this is the code that decides whether a
 * malformed model response degrades quietly or blows up a test run.
 */

/**
 * Extracts a JSON object from model output.
 *
 * Structured outputs normally return bare JSON, but a fenced block or a
 * sentence of preamble must never be treated as a hard failure, so both are
 * tolerated here.
 */
export function extractJson(raw: string): AiResult<unknown> {
  const text = raw.trim();
  if (text.length === 0) {
    return { ok: false, reason: 'parse-error', detail: 'empty response' };
  }

  const candidates: string[] = [text];

  // ```json … ``` or ``` … ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  // First balanced-looking object, for responses wrapped in prose.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return { ok: true, data: JSON.parse(candidate) };
    } catch {
      // Try the next candidate.
    }
  }

  return { ok: false, reason: 'parse-error', detail: text.slice(0, 200) };
}

/** Clamps a possibly-absent, possibly-out-of-range confidence into 0..1. */
export function normaliseConfidence(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(1, Math.max(0, parsed));
}

/** Narrow an unknown to a plain object without asserting its shape. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a string field, returning `fallback` when it is missing or blank. */
export function readString(source: Record<string, unknown>, key: string, fallback = ''): string {
  const value = source[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

/**
 * Strips a DOM snapshot down to something worth sending: no scripts, styles,
 * comments or SVG paths, collapsed whitespace, and hard-capped in length.
 *
 * Serves two purposes — it keeps token cost bounded, and it avoids shipping
 * inline script contents (a common place for tokens and keys) to a third party.
 */
export function pruneDom(html: string, maxChars = 12_000): string {
  const cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '<svg/>')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length <= maxChars ? cleaned : `${cleaned.slice(0, maxChars)}… [truncated]`;
}

/** Truncates any long free-text field before it goes into a prompt. */
export function truncate(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}… [truncated]`;
}
