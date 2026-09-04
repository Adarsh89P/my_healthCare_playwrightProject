import { expect, test } from '@playwright/test';
import {
  extractJson,
  isRecord,
  normaliseConfidence,
  pruneDom,
  readString,
  truncate,
} from '@ai/parse';
import { toTriageVerdict } from '@ai/failure-triage/triage';
import { toHealFields } from '@ai/self-healing/healer';
import { describeSkip } from '@ai/client';

/**
 * Unit tests for the AI layer's parsing and fallback paths.
 *
 * These matter more than the happy path: they are what guarantee a malformed,
 * refused or absent AI response degrades quietly instead of failing a test run.
 * No browser, no network.
 */

test.describe('extractJson', () => {
  test('parses bare JSON', () => {
    const result = extractJson('{"category":"flaky"}');
    expect(result.ok).toBe(true);
    expect(result.ok && result.data).toEqual({ category: 'flaky' });
  });

  test('parses a fenced json block', () => {
    const result = extractJson('```json\n{"a":1}\n```');
    expect(result.ok && result.data).toEqual({ a: 1 });
  });

  test('parses an unlabelled fenced block', () => {
    const result = extractJson('```\n{"a":2}\n```');
    expect(result.ok && result.data).toEqual({ a: 2 });
  });

  test('recovers JSON wrapped in prose', () => {
    const result = extractJson('Here is my analysis:\n{"a":3}\nHope that helps.');
    expect(result.ok && result.data).toEqual({ a: 3 });
  });

  test('reports parse-error for an empty response', () => {
    const result = extractJson('   ');
    expect(result).toMatchObject({ ok: false, reason: 'parse-error' });
  });

  test('reports parse-error for malformed JSON rather than throwing', () => {
    const result = extractJson('{"category": broken');
    expect(result).toMatchObject({ ok: false, reason: 'parse-error' });
  });
});

test.describe('normaliseConfidence', () => {
  const cases: [unknown, number][] = [
    [0.75, 0.75],
    ['0.5', 0.5],
    [1.8, 1], // clamped
    [-3, 0], // clamped
    ['not a number', 0],
    [undefined, 0],
    [null, 0],
  ];

  for (const [input, expected] of cases) {
    test(`maps ${JSON.stringify(input)} to ${expected}`, () => {
      expect(normaliseConfidence(input)).toBe(expected);
    });
  }
});

test.describe('readString / isRecord', () => {
  test('falls back when a field is missing or blank', () => {
    expect(readString({}, 'x', 'fallback')).toBe('fallback');
    expect(readString({ x: '   ' }, 'x', 'fallback')).toBe('fallback');
    expect(readString({ x: 42 }, 'x', 'fallback')).toBe('fallback');
    expect(readString({ x: ' hello ' }, 'x')).toBe('hello');
  });

  test('rejects arrays and null as records', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('string')).toBe(false);
  });
});

test.describe('pruneDom', () => {
  test('strips scripts, styles, comments and svg bodies', () => {
    const html = `
      <html><head><style>.a{color:red}</style></head>
      <body>
        <script>const apiKey = "super-secret-token";</script>
        <!-- a comment -->
        <svg><path d="M0 0 L10 10"/></svg>
        <button id="go">Go</button>
      </body></html>`;

    const pruned = pruneDom(html);

    expect(pruned).toContain('<button id="go">Go</button>');
    // Inline scripts are a common home for tokens - they must never be sent.
    expect(pruned).not.toContain('super-secret-token');
    expect(pruned).not.toContain('color:red');
    expect(pruned).not.toContain('a comment');
    expect(pruned).not.toContain('M0 0 L10 10');
  });

  test('caps length and marks the truncation', () => {
    const pruned = pruneDom(`<div>${'x'.repeat(5_000)}</div>`, 100);
    expect(pruned.length).toBeLessThan(200);
    expect(pruned).toContain('[truncated]');
  });
});

test.describe('truncate', () => {
  test('leaves short text alone', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  test('marks long text', () => {
    expect(truncate('x'.repeat(50), 10)).toContain('[truncated]');
  });
});

test.describe('toTriageVerdict', () => {
  test('accepts a well-formed verdict', () => {
    const result = toTriageVerdict({
      category: 'product-bug',
      confidence: 0.9,
      reasoning: 'The confirmation showed the wrong facility.',
      suggestedAction: 'Raise a defect against the booking service.',
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.category).toBe('product-bug');
    expect(result.ok && result.data.confidence).toBe(0.9);
  });

  test('normalises category casing', () => {
    const result = toTriageVerdict({ category: 'FLAKY', confidence: 0.4 });
    expect(result.ok && result.data.category).toBe('flaky');
  });

  test('supplies defaults for missing prose fields', () => {
    const result = toTriageVerdict({ category: 'test-bug', confidence: 0.5 });
    expect(result.ok && result.data.reasoning).toBe('No reasoning supplied.');
    expect(result.ok && result.data.suggestedAction).toBe('No suggested action supplied.');
  });

  test('rejects an unknown category instead of guessing', () => {
    const result = toTriageVerdict({ category: 'cosmic-ray', confidence: 1 });
    expect(result).toMatchObject({ ok: false, reason: 'invalid-shape' });
  });

  test('rejects non-object input', () => {
    expect(toTriageVerdict('nope')).toMatchObject({ ok: false, reason: 'invalid-shape' });
    expect(toTriageVerdict(null)).toMatchObject({ ok: false, reason: 'invalid-shape' });
    expect(toTriageVerdict([])).toMatchObject({ ok: false, reason: 'invalid-shape' });
  });
});

test.describe('toHealFields', () => {
  test('accepts a well-formed suggestion', () => {
    const result = toHealFields({
      suggestedSelector: '[data-test="submit"]',
      strategy: 'data-test attribute',
      confidence: 0.8,
      reasoning: 'Only element with a matching label.',
    });

    expect(result.ok && result.data.suggestedSelector).toBe('[data-test="submit"]');
    expect(result.ok && result.data.confidence).toBe(0.8);
  });

  test('rejects a suggestion with no selector', () => {
    expect(toHealFields({ confidence: 0.9 })).toMatchObject({ ok: false, reason: 'invalid-shape' });
    expect(toHealFields({ suggestedSelector: '  ' })).toMatchObject({
      ok: false,
      reason: 'invalid-shape',
    });
  });

  test('defaults strategy and reasoning when absent', () => {
    const result = toHealFields({ suggestedSelector: '#id', confidence: 0.1 });
    expect(result.ok && result.data.strategy).toBe('unspecified');
    expect(result.ok && result.data.reasoning).toBe('No reasoning supplied.');
  });
});

test.describe('describeSkip', () => {
  test('explains every known skip reason', () => {
    for (const reason of [
      'disabled',
      'no-api-key',
      'refused',
      'timeout',
      'api-error',
      'parse-error',
      'invalid-shape',
    ]) {
      expect(describeSkip(reason)).not.toBe('AI produced no result.');
    }
  });

  test('falls back for an unrecognised reason', () => {
    expect(describeSkip('something-new')).toBe('AI produced no result.');
  });
});
