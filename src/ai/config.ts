/**
 * Configuration for the optional AI-assisted layer.
 *
 * Every AI feature is OFF by default. With `AI_ENABLED` unset — or with no API
 * key present — the framework performs zero AI calls and behaves exactly as it
 * would without this directory. Nothing here can change a test's pass/fail
 * verdict; the AI layer only annotates, suggests and reports.
 */

function flag(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function num(name: string, fallback: number): number {
  const parsed = Number(process.env[name]?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const aiConfig = {
  /** Read from the environment only — never committed, never logged. */
  get apiKey(): string | undefined {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    return key && key.length > 0 ? key : undefined;
  },

  /** Master switch. Every feature below also requires a key to be present. */
  get enabled(): boolean {
    return flag('AI_ENABLED') && this.apiKey !== undefined;
  },

  /** Classify failures and attach the verdict to the report. */
  get triageEnabled(): boolean {
    return this.enabled && flag('AI_TRIAGE', true);
  },

  /**
   * Suggest a replacement selector when one stops matching.
   * Off even when AI is enabled — opt in explicitly, because it retries actions.
   */
  get healingEnabled(): boolean {
    return this.enabled && flag('AI_SELF_HEALING', false);
  },

  // TODO: pin a different model here if your organisation standardises on one.
  get model(): string {
    return process.env.AI_MODEL?.trim() || 'claude-opus-5';
  },

  /** Caps thinking + response together, so leave headroom. */
  get maxTokens(): number {
    return num('AI_MAX_TOKENS', 4096);
  },

  /** low | medium | high | xhigh | max. Classification does not need depth. */
  get effort(): 'low' | 'medium' | 'high' | 'xhigh' | 'max' {
    const raw = process.env.AI_EFFORT?.trim().toLowerCase();
    const allowed = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
    const match = allowed.find((level) => level === raw);
    return match ?? 'low';
  },

  /**
   * Hard ceiling on a single AI call. A hung request must never be able to
   * stall a CI run, so this is deliberately short.
   */
  get timeoutMs(): number {
    return num('AI_TIMEOUT_MS', 30_000);
  },

  /** Where advisory artefacts are written. */
  get outputDir(): string {
    return process.env.AI_OUTPUT_DIR?.trim() || 'test-results/ai';
  },
} as const;
