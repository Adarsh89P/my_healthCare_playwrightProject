/**
 * Healthcare (CURA demo) application constants.
 *
 * URLs, credentials and timeouts are NOT here - those live in `.env.<TEST_ENV>`
 * and are read through `@core/config/env`, so the same code runs against any
 * environment. This file holds only what is genuinely specific to this app's
 * shape: its routes.
 */
export const ROUTES = {
  home: '/',
  login: '/#login',
  appointment: '/#appointment',
  confirmation: '/#summary',
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
