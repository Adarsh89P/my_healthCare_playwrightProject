import { ApiClient, ApiError } from '@core/api/ApiClient';
import { Credentials } from '@core/config/env';
import { logger } from '@core/utils/logger';

/**
 * Token acquisition and caching for API tests.
 *
 * Scope: **once per worker process.** Playwright runs each worker in its own
 * Node process, so a module-level cache is a per-worker cache for free - no
 * `worker`-scoped fixture plumbing needed to get the lifetime right. Four
 * workers running two hundred tests perform four logins, not two hundred.
 *
 * Contains no knowledge of any particular API. The auth path, the shape of the
 * response, and how the token becomes a header are all injected, because those
 * three things differ per service: Restful-Booker wants `Cookie: token=...`,
 * most REST APIs want `Authorization: Bearer ...`, and some want a bare
 * `X-Api-Key`. That decision belongs to `src/apps/<app>/api`.
 */

/** Turns a raw token into the headers that authenticate a request. */
export type TokenHeaderFactory = (token: string) => Record<string, string>;

/** `Authorization: Bearer <token>` - the common case. */
export const bearerHeader: TokenHeaderFactory = (token) => ({
  authorization: `Bearer ${token}`,
});

/** `Cookie: token=<token>` - what Restful-Booker actually expects. */
export const cookieTokenHeader: TokenHeaderFactory = (token) => ({
  cookie: `token=${token}`,
});

export interface TokenRequest {
  /** Unauthenticated client used to perform the login call itself. */
  client: ApiClient;
  /** Path of the auth endpoint, e.g. `/auth`. */
  path: string;
  /**
   * Credentials, passed as the object rather than two strings so the lazy
   * getters in `config` stay lazy: a suite that never calls `getToken()` never
   * touches `API_USERNAME`, and so never fails for lacking it.
   */
  credentials: Credentials;
  /** Extracts the token from the response body. */
  readToken: (body: unknown) => string | undefined;
}

/**
 * Cache of in-flight and settled logins, keyed per endpoint + account.
 *
 * The value is the *promise*, not the token. Several tests in one worker can
 * ask concurrently before the first login returns; caching the promise means
 * they all await the same request instead of racing to issue their own.
 */
const tokenCache = new Map<string, Promise<string>>();

function cacheKey(request: TokenRequest): string {
  // Reading `username` resolves the lazy getter - by this point we are
  // committed to authenticating, so requiring the variable is correct.
  return `${request.path}::${request.credentials.username}`;
}

/**
 * Returns a token for these credentials, logging in at most once per worker.
 *
 * A failed login is evicted from the cache so that a transient 503 does not
 * poison every remaining test in the worker with the same rejected promise.
 */
export async function getToken(request: TokenRequest): Promise<string> {
  const key = cacheKey(request);

  const cached = tokenCache.get(key);
  if (cached) return cached;

  const pending = acquireToken(request).catch((error: unknown) => {
    tokenCache.delete(key);
    throw error;
  });

  tokenCache.set(key, pending);
  return pending;
}

async function acquireToken(request: TokenRequest): Promise<string> {
  const { client, path, credentials, readToken } = request;

  const response = await client.post<unknown>(path, {
    username: credentials.username,
    password: credentials.password,
  });

  // A 200 that carries no token is a contract violation, not a pass. Several
  // APIs - Restful-Booker among them - answer 200 with `{"reason":"Bad
  // credentials"}`, which an unchecked `response.status === 200` would accept.
  const token = readToken(response.body);
  if (!token) {
    throw new ApiError(
      `responded ${response.status} without a usable token`,
      'POST',
      path,
      response.status,
      response.body
    );
  }

  logger.debug(`Acquired API token for "${credentials.username}" (worker-cached)`);
  return token;
}

/**
 * Builds the auth headers, acquiring the token on first use.
 *
 * Callers pass the result to `ApiClient`'s `defaultHeaders`, so the token is
 * attached to every subsequent request without each spec remembering to.
 */
export async function authHeaders(
  request: TokenRequest,
  toHeader: TokenHeaderFactory = bearerHeader
): Promise<Record<string, string>> {
  return toHeader(await getToken(request));
}

/**
 * Drops every cached token.
 *
 * For tests of this module and for a spec that deliberately exercises token
 * expiry. Production test runs should never need it - if a suite calls this to
 * work around a stale token, the token lifetime is the bug.
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}
