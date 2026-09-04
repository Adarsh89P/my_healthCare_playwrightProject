/** Shared types for the AI-assisted layer. */

/**
 * Why an AI call produced nothing. Every one of these is a normal, expected
 * outcome that the caller must handle by carrying on without AI.
 */
export type AiSkipReason =
  | 'disabled' // AI_ENABLED is off
  | 'no-api-key' // ANTHROPIC_API_KEY absent
  | 'refused' // safety classifiers declined the request
  | 'timeout'
  | 'api-error'
  | 'parse-error' // response was not the JSON shape we asked for
  | 'invalid-shape'; // parsed, but failed validation

export type AiResult<T> =
  { ok: true; data: T } | { ok: false; reason: AiSkipReason; detail?: string };

export const TRIAGE_CATEGORIES = ['product-bug', 'test-bug', 'environment-issue', 'flaky'] as const;

export type TriageCategory = (typeof TRIAGE_CATEGORIES)[number];

export interface TriageVerdict {
  category: TriageCategory;
  /** 0..1 — how sure the model is. Displayed, never acted on automatically. */
  confidence: number;
  reasoning: string;
  suggestedAction: string;
}

/** Everything we can gather about a failure without slowing the happy path. */
export interface FailureContext {
  testTitle: string;
  filePath: string;
  projectName: string;
  errorMessage: string;
  stack?: string;
  /** Truncated, script/style-stripped DOM at the moment of failure. */
  domSnapshot?: string;
  /** Last API response body, when the failure came from an API test. */
  apiResponse?: string;
  retryIndex: number;
  durationMs: number;
}

export interface HealSuggestion {
  /** The selector that stopped matching. */
  failedSelector: string;
  /** What the element was for, in words — the model's main clue. */
  intent: string;
  suggestedSelector: string;
  strategy: string;
  confidence: number;
  reasoning: string;
  /** Whether a retry using the suggestion actually succeeded. */
  verified: boolean;
  testTitle: string;
  url: string;
  timestamp: string;
}

export interface FlakyTestRecord {
  title: string;
  runs: number;
  failures: number;
  /** failures / runs — 0 and 1 are stable, values between are flaky. */
  failureRate: number;
  /** Peaks at 1.0 for a 50/50 pass-fail split. */
  flakinessScore: number;
  errorSamples: string[];
}

export interface FlakyAnalysis {
  totalRuns: number;
  flaky: FlakyTestRecord[];
  /** Populated only when AI is enabled. */
  probableCauses?: Record<string, string>;
}
