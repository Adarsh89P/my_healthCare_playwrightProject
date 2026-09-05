import { APIRequestContext, APIResponse, test } from '@playwright/test';
import { logger } from '@core/utils/logger';

/**
 * A thin, typed wrapper over Playwright's `APIRequestContext`.
 *
 * Two things justify the layer over calling `request.get()` directly:
 *
 *  1. Every call emits a `test.step`, so an API test reads in the HTML and
 *     Allure reports exactly the way a UI test does - a named line per
 *     interaction rather than one opaque assertion.
 *  2. Specs receive a plain `ApiResult<T>`, never a raw `APIResponse`. A raw
 *     response is lazy (`.json()` is async, consumable once) and untyped, which
 *     is how `expect(body.id).toBeTruthy()` creeps into a suite.
 *
 * Contains no knowledge of any particular API: base URL, headers and
 * credentials are all injected. Endpoint definitions belong to the app under
 * `src/apps/<app>/api`, not here.
 */

/** A fully-read HTTP response. Body is parsed once, eagerly. */
export interface ApiResult<T> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

/**
 * Thrown for transport failures, unparseable bodies, and unmet `expectStatus`.
 *
 * A non-2xx status is NOT an error by itself - negative tests assert 4xx as
 * their expected outcome, so the client stays neutral and lets the spec decide.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly method: string,
    readonly path: string,
    readonly status?: number,
    readonly body?: unknown
  ) {
    // Naming the endpoint in the message is the whole point: "expected 200,
    // received 500" tells you nothing when a spec makes six calls.
    super(`${method} ${path} - ${message}`);
    this.name = 'ApiError';
  }
}

export type QueryParams = Record<string, string | number | boolean>;

export interface RequestOptions {
  /** Merged over the client's default headers. */
  headers?: Record<string, string>;
  /** Query string values, encoded by Playwright. */
  params?: QueryParams;
  /** Overrides the client's default timeout for this call only. */
  timeout?: number;
  /**
   * Assert the status before returning. On mismatch the thrown `ApiError`
   * carries the endpoint and the response body, so the failure explains
   * itself without a debugger.
   *
   * Leave unset in tests that assert the status themselves.
   */
  expectStatus?: number | number[];
  /**
   * Retry policy. Empty by default and deliberately so: a retry hides a race
   * as easily as it absorbs a blip, and a suite that retries everything stops
   * being able to detect instability.
   *
   * Set it ONLY on an endpoint that is genuinely eventually consistent, and
   * say why at the call site.
   */
  retryOn?: number[];
  /** Attempts after the first. Ignored unless `retryOn` is set. */
  retries?: number;
  /** Delay between retries. Ignored unless `retryOn` is set. */
  retryDelayMs?: number;
}

export interface ApiClientOptions {
  /** Prepended to every path. Trailing slash optional. */
  baseUrl: string;
  /** Sent on every request; per-call headers win. */
  defaultHeaders?: Record<string, string>;
  /** Per-request budget. API calls should be far quicker than UI actions. */
  timeout?: number;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Bodies Playwright will serialise for us. */
type JsonBody = unknown;

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeout: number;

  constructor(
    private readonly request: APIRequestContext,
    options: ApiClientOptions
  ) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.defaultHeaders = {
      accept: 'application/json',
      'content-type': 'application/json',
      ...options.defaultHeaders,
    };
  }

  // ------------------------------------------------------------------ verbs

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.send<T>('GET', path, undefined, options);
  }

  async post<T>(path: string, body?: JsonBody, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.send<T>('POST', path, body, options);
  }

  async put<T>(path: string, body?: JsonBody, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.send<T>('PUT', path, body, options);
  }

  async patch<T>(path: string, body?: JsonBody, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.send<T>('PATCH', path, body, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.send<T>('DELETE', path, undefined, options);
  }

  /**
   * Escape hatch for a genuinely malformed request - a body that is not valid
   * JSON, which the typed verbs cannot express because Playwright serialises
   * `data` for you. Used by the contract tests that assert the API rejects
   * junk with a 4xx rather than a 500.
   */
  async sendRaw<T>(
    method: Method,
    path: string,
    rawBody: string,
    options?: RequestOptions
  ): Promise<ApiResult<T>> {
    return this.send<T>(method, path, undefined, options, rawBody);
  }

  // ---------------------------------------------------------------- internals

  private async send<T>(
    method: Method,
    path: string,
    body?: JsonBody,
    options?: RequestOptions,
    rawBody?: string
  ): Promise<ApiResult<T>> {
    return this.step(`${method} ${path}`, async () => {
      const attempts = options?.retryOn?.length ? (options.retries ?? 2) + 1 : 1;
      let result: ApiResult<T> | undefined;

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        result = await this.sendOnce<T>(method, path, body, options, rawBody);

        const retryable = options?.retryOn?.includes(result.status) ?? false;
        if (!retryable || attempt === attempts) break;

        logger.warn(
          `${method} ${path} returned ${result.status}; retrying (${attempt}/${attempts - 1})`
        );
        await this.wait(options?.retryDelayMs ?? 500);
      }

      // `attempts` is always >= 1, so the loop has assigned `result`.
      const settled = result as ApiResult<T>;
      this.assertStatus(method, path, settled, options?.expectStatus);
      return settled;
    });
  }

  private async sendOnce<T>(
    method: Method,
    path: string,
    body: JsonBody | undefined,
    options: RequestOptions | undefined,
    rawBody?: string
  ): Promise<ApiResult<T>> {
    const url = this.resolve(path);
    const started = Date.now();

    let response: APIResponse;
    try {
      response = await this.request.fetch(url, {
        method,
        headers: { ...this.defaultHeaders, ...options?.headers },
        timeout: options?.timeout ?? this.timeout,
        ...(options?.params ? { params: options.params } : {}),
        // `data` serialises to JSON; `body` sends the string verbatim, which
        // is what the malformed-payload tests need.
        ...(rawBody !== undefined ? { body: rawBody } : {}),
        ...(rawBody === undefined && body !== undefined ? { data: body } : {}),
      });
    } catch (error) {
      // A transport failure (DNS, connection reset, timeout) is never the
      // subject of a test - surface it named, not as a bare Playwright error.
      throw new ApiError(
        error instanceof Error ? error.message : String(error),
        method,
        path,
        undefined,
        undefined
      );
    }

    const durationMs = Date.now() - started;
    const status = response.status();
    logger.info(`${method} ${path} -> ${status} (${durationMs} ms)`);

    return {
      status,
      headers: response.headers(),
      body: await this.readBody<T>(response, method, path),
    };
  }

  /** Reads and parses the body exactly once. */
  private async readBody<T>(response: APIResponse, method: string, path: string): Promise<T> {
    const text = await response.text();

    // 204 and empty 200s are legitimate; `undefined` is the honest value.
    if (text.trim().length === 0) return undefined as T;

    const contentType = response.headers()['content-type'] ?? '';
    if (!contentType.includes('json')) {
      // Some APIs answer in text/plain - Restful-Booker's DELETE is one.
      return text as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(
        `responded ${response.status()} with a body that is not valid JSON`,
        method,
        path,
        response.status(),
        text.slice(0, 500)
      );
    }
  }

  private assertStatus<T>(
    method: string,
    path: string,
    result: ApiResult<T>,
    expected?: number | number[]
  ): void {
    if (expected === undefined) return;

    const allowed = Array.isArray(expected) ? expected : [expected];
    if (allowed.includes(result.status)) return;

    throw new ApiError(
      `expected status ${allowed.join(' or ')}, received ${result.status}`,
      method,
      path,
      result.status,
      result.body
    );
  }

  private resolve(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
  }

  /**
   * `test.step` throws outside a running test, and this client is also used by
   * worker-scoped fixtures (token acquisition) which run outside one. Fall back
   * to plain execution there rather than forcing callers to know the context.
   */
  private async step<T>(title: string, body: () => Promise<T>): Promise<T> {
    try {
      test.info();
    } catch {
      return body();
    }
    return test.step(title, body);
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
