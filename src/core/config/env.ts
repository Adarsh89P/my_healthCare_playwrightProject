import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Central, validated configuration for the whole framework.
 *
 * Nothing else in the codebase should read `process.env` directly - everything
 * goes through the `config` object exported here, so that a missing or
 * malformed variable fails once, loudly, with a message that says how to fix
 * it, instead of surfacing as `undefined` somewhere deep in a test.
 *
 * To point the framework at a different application you only change the
 * .env.<TEST_ENV> file - no code changes.
 */

let loaded = false;

/**
 * Loads .env.<TEST_ENV> exactly once. Values already present in the real
 * environment always win, so CI (which injects variables directly) does not
 * need the file to exist at all.
 */
function loadEnvFile(): void {
  if (loaded) return;
  loaded = true;

  const testEnv = process.env.TEST_ENV ?? 'uat';
  const envPath = path.resolve(process.cwd(), `.env.${testEnv}`);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

function required(name: string): string {
  loadEnvFile();
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}".\n` +
        `Copy .env.example to .env.${process.env.TEST_ENV ?? 'uat'} and fill it in, ` +
        `or export ${name} directly (this is how CI supplies it).`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  loadEnvFile();
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = optional(name, String(fallback));
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable "${name}" must be a number, received "${raw}".`);
  }
  return parsed;
}

function optionalBoolean(name: string, fallback: boolean): boolean {
  const raw = optional(name, String(fallback)).toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export interface Credentials {
  username: string;
  password: string;
}

/**
 * Credentials are resolved lazily: a project that only ever logs in as a
 * standard user should not be forced to define admin credentials.
 */
function credentials(prefix: string): Credentials {
  return {
    get username() {
      return required(`${prefix}_USERNAME`);
    },
    get password() {
      return required(`${prefix}_PASSWORD`);
    },
  };
}

export const config = {
  /** Which .env file was loaded - useful for tagging reports. */
  get env(): string {
    loadEnvFile();
    return process.env.TEST_ENV ?? 'uat';
  },

  /** Base URL of the application under test. */
  get baseUrl(): string {
    return required('BASE_URL');
  },

  /** Base URL for API tests. Falls back to BASE_URL when unset. */
  get apiBaseUrl(): string {
    loadEnvFile();
    return optional('API_BASE_URL', this.baseUrl);
  },

  /** Standard end-user account. */
  get user(): Credentials {
    return credentials('APP_USER');
  },

  /** Elevated account, for projects that need one. */
  get admin(): Credentials {
    return credentials('APP_ADMIN');
  },

  /** Whether the framework is running inside CI. */
  get isCI(): boolean {
    return Boolean(process.env.CI);
  },

  timeouts: {
    /** Per-test budget. */
    get test(): number {
      return optionalNumber('TIMEOUT_TEST', 60_000);
    },
    /** Per-assertion budget (`expect(...)`). */
    get expect(): number {
      return optionalNumber('TIMEOUT_EXPECT', 10_000);
    },
    /** Per-action budget (click, fill, ...). */
    get action(): number {
      return optionalNumber('TIMEOUT_ACTION', 15_000);
    },
    /** Page navigation budget. */
    get navigation(): number {
      return optionalNumber('TIMEOUT_NAVIGATION', 30_000);
    },
  },

  /** Logger verbosity: error | warn | info | debug. */
  get logLevel(): string {
    return optional('LOG_LEVEL', 'info');
  },

  /** Set HEADED=true locally to watch the browser. */
  get headed(): boolean {
    return optionalBoolean('HEADED', false);
  },

  /**
   * Which browser projects to build, as a comma-separated list.
   *
   * Defaults to Chromium only for local runs (fast feedback loop) and all three
   * engines in CI (real cross-browser coverage). Override any time:
   *   BROWSERS=chromium,webkit npm test
   */
  get browsers(): BrowserName[] {
    loadEnvFile();
    const fallback = this.isCI ? 'chromium,firefox,webkit' : 'chromium';
    const requested = optional('BROWSERS', fallback)
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    const invalid = requested.filter((name) => !isBrowserName(name));
    if (invalid.length > 0) {
      throw new Error(
        `Unknown browser(s) in BROWSERS: ${invalid.join(', ')}. ` +
          `Valid values are: ${BROWSER_NAMES.join(', ')}.`
      );
    }
    return requested as BrowserName[];
  },
} as const;

export const BROWSER_NAMES = ['chromium', 'firefox', 'webkit'] as const;
export type BrowserName = (typeof BROWSER_NAMES)[number];

function isBrowserName(value: string): value is BrowserName {
  return (BROWSER_NAMES as readonly string[]).includes(value);
}
