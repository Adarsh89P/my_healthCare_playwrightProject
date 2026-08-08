/**
 * Project test data.
 *
 * Credentials deliberately do NOT live here - they come from the environment
 * via `config.user` / `config.admin`, so nothing secret is ever committed.
 */

export const FACILITIES = {
  tokyo: 'Tokyo CURA Healthcare Center',
  hongKong: 'Hongkong CURA Healthcare Center',
  seoul: 'Seoul CURA Healthcare Center',
} as const;

export const ALL_FACILITIES = Object.values(FACILITIES);

export const MESSAGES = {
  loginFailed: 'Login failed! Please ensure the username and password are valid.',
} as const;
