import { Locator, Page } from '@playwright/test';
import { askForJson } from '@ai/client';
import { aiConfig } from '@ai/config';
import { isRecord, normaliseConfidence, pruneDom, readString } from '@ai/parse';
import { AiResult, HealSuggestion } from '@ai/types';
import { logger } from '@core/utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * AI-assisted locator healing - SUGGEST ONLY.
 *
 * When a selector stops matching, this asks the model for the most likely
 * replacement, retries the action once, and records the suggestion for a human
 * to review. It never rewrites source and never commits anything: an
 * auto-applied selector fix that nobody reviews is a silent way to stop
 * testing what you think you are testing.
 *
 * A healed action is recorded so the run is honest about it - see
 * `healing-report.json`.
 */

const SYSTEM_PROMPT = `You repair broken CSS/XPath selectors for an end-to-end test suite.

Given a selector that no longer matches and the current DOM, return the single
most likely replacement for the SAME element.

Rules:
- Prefer stable attributes: data-test / data-testid / id / name / aria-label / role.
- Prefer a visible, unique, human-meaningful anchor over a brittle positional path.
- Never invent an attribute that is not in the DOM you were given.
- If no element plausibly matches the stated intent, return confidence 0 and
  explain why. A wrong selector is worse than none.`;

const HEAL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    suggestedSelector: { type: 'string' },
    strategy: { type: 'string' },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
  },
  required: ['suggestedSelector', 'strategy', 'confidence', 'reasoning'],
  additionalProperties: false,
};

/** Validates a raw heal response. Exported for unit tests. */
export function toHealFields(
  data: unknown
): AiResult<Pick<HealSuggestion, 'suggestedSelector' | 'strategy' | 'confidence' | 'reasoning'>> {
  if (!isRecord(data)) {
    return { ok: false, reason: 'invalid-shape', detail: 'not an object' };
  }

  const suggestedSelector = readString(data, 'suggestedSelector');
  if (!suggestedSelector) {
    return { ok: false, reason: 'invalid-shape', detail: 'no selector suggested' };
  }

  return {
    ok: true,
    data: {
      suggestedSelector,
      strategy: readString(data, 'strategy', 'unspecified'),
      confidence: normaliseConfidence(data['confidence']),
      reasoning: readString(data, 'reasoning', 'No reasoning supplied.'),
    },
  };
}

export interface HealAttempt {
  failedSelector: string;
  intent: string;
  testTitle: string;
}

/**
 * Asks for a replacement selector and checks whether it actually resolves.
 * Returns undefined whenever AI is unavailable or the suggestion is unusable.
 */
export async function attemptHeal(
  page: Page,
  attempt: HealAttempt
): Promise<{ suggestion: HealSuggestion; locator: Locator } | undefined> {
  if (!aiConfig.healingEnabled || page.isClosed()) return undefined;

  try {
    const dom = pruneDom(await page.content());

    const response = await askForJson({
      system: SYSTEM_PROMPT,
      prompt: [
        `Failed selector: ${attempt.failedSelector}`,
        `Element intent: ${attempt.intent}`,
        `Page URL: ${page.url()}`,
        '',
        'Current DOM:',
        dom,
      ].join('\n'),
      schema: HEAL_SCHEMA,
    });

    if (!response.ok) {
      logger.debug(`Locator healing skipped: ${response.reason}`);
      return undefined;
    }

    const fields = toHealFields(response.data);
    if (!fields.ok || fields.data.confidence === 0) return undefined;

    const locator = page.locator(fields.data.suggestedSelector);
    // A suggestion that resolves to zero or many elements is not a fix.
    const verified = (await locator.count()) === 1;

    const suggestion: HealSuggestion = {
      failedSelector: attempt.failedSelector,
      intent: attempt.intent,
      ...fields.data,
      verified,
      testTitle: attempt.testTitle,
      url: page.url(),
      timestamp: new Date().toISOString(),
    };

    recordSuggestion(suggestion);

    if (!verified) {
      logger.warn(
        `Healing suggestion for "${attempt.failedSelector}" did not resolve uniquely - not retrying`
      );
      return undefined;
    }

    logger.warn(
      `Locator healed: "${attempt.failedSelector}" -> "${suggestion.suggestedSelector}" ` +
        '(suggestion only - review and commit the fix yourself)'
    );
    return { suggestion, locator };
  } catch (error) {
    logger.debug(`Locator healing errored, ignoring: ${String(error)}`);
    return undefined;
  }
}

/** Appends a suggestion to `healing-report.json`. Best-effort. */
export function recordSuggestion(suggestion: HealSuggestion): void {
  try {
    const dir = path.resolve(process.cwd(), aiConfig.outputDir);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'healing-report.json');

    const existing: HealSuggestion[] = fs.existsSync(file)
      ? (JSON.parse(fs.readFileSync(file, 'utf-8')) as HealSuggestion[])
      : [];

    existing.push(suggestion);
    fs.writeFileSync(file, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
  } catch {
    // Reporting is best-effort.
  }
}
