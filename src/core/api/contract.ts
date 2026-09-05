import { z } from 'zod';

/**
 * Response contract validation.
 *
 * Why every response is schema-validated, and not just spot-asserted:
 *
 *   expect(response.status).toBe(200);
 *   expect(body.bookingid).toBeTruthy();
 *
 * That pair passes when the API returns `{"bookingid": "42"}` instead of a
 * number, when `totalprice` silently disappears, and when a nested date comes
 * back as `null`. A 200 carrying a malformed body is a defect, and an untyped
 * assertion is structurally incapable of catching it - it only ever checks the
 * one field the author happened to think of.
 *
 * Schemas are also the single source of truth for types: each resource derives
 * its TypeScript type with `z.infer`, so there is no hand-written interface to
 * drift out of step with the validation.
 */

/** Thrown when a response body does not match its declared contract. */
export class ContractError extends Error {
  constructor(
    readonly context: string,
    readonly issues: ContractIssue[],
    readonly received: unknown
  ) {
    super(
      [
        `${context} returned a body that does not match its contract:`,
        ...issues.map((issue) => `  - ${issue.path}: ${issue.message}`),
        '',
        `Received: ${preview(received)}`,
      ].join('\n')
    );
    this.name = 'ContractError';
  }
}

export interface ContractIssue {
  /** Dotted path to the offending field, e.g. `bookingdates.checkin`. */
  path: string;
  message: string;
}

/**
 * Validates `body` against `schema` and returns it typed.
 *
 * `context` names the call in the failure message - pass `POST /booking`, not
 * `booking`, so a spec making six requests says which one broke.
 */
export function parseAs<T>(schema: z.ZodType<T>, body: unknown, context: string): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  throw new ContractError(context, toIssues(result.error), body);
}

/**
 * Non-throwing variant, for the handful of places that need to branch on
 * validity rather than fail - the known-defect tests in particular, which
 * assert that a response is *wrong* in a specific way.
 */
export function tryParseAs<T>(
  schema: z.ZodType<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; issues: ContractIssue[] } {
  const result = schema.safeParse(body);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, issues: toIssues(result.error) };
}

function toIssues(error: z.ZodError): ContractIssue[] {
  return error.issues.map((issue) => ({
    path: formatPath(issue.path),
    message: issue.message,
  }));
}

/**
 * Renders a zod path as the expression you would type to reach the field:
 * `['bookingdates', 'checkin']` -> `bookingdates.checkin`
 * `['results', 0, 'id']`        -> `results[0].id`
 * `[]`                          -> `(root)`
 */
function formatPath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) return '(root)';

  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`;
    return acc.length === 0 ? String(segment) : `${acc}.${String(segment)}`;
  }, '');
}

/** Keeps a failure message readable when the body is large. */
function preview(value: unknown, maxLength = 800): string {
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }

  if (text === undefined) return 'undefined';
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n… [truncated]` : text;
}
