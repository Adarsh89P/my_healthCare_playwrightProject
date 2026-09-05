/**
 * Template application constants.
 *
 * Copy `src/apps/_template` to `src/apps/<your-app>`, then point the framework
 * at the new app with `APP=<your-app> npm test`. URLs and credentials come from
 * `.env.<TEST_ENV>` via `@core/config/env` - never hard-code them here.
 */
export const ROUTES = {
  home: '/',
  // TODO: replace with the routes your application actually exposes.
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
