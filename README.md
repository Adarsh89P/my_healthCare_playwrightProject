# Playwright Test Automation Framework

[![Playwright Tests](https://github.com/Adarsh89P/my_healthCare_playwrightProject/actions/workflows/playwright.yml/badge.svg)](https://github.com/Adarsh89P/my_healthCare_playwrightProject/actions/workflows/playwright.yml)

A reusable end-to-end test automation framework built with **Playwright + TypeScript**.
Point it at any web application by editing one `.env` file — no framework rebuild, no
code changes to the core.

The repository ships with a working reference suite against the
[CURA Healthcare](https://katalon-demo-cura.herokuapp.com/) demo app so the framework is
runnable the moment you clone it.

---

## Why this is reusable

The codebase is split into two layers with a hard boundary between them:

| Layer                                                   | What it contains                                       | Changes per project?   |
| ------------------------------------------------------- | ------------------------------------------------------ | ---------------------- |
| **`src/core/`** — the framework                         | Base page, validated config, logger, date/data helpers | **No** — copy as-is    |
| **`src/pages`, `src/testdata`, `tests/`** — the project | Page objects, test data, specs                         | Yes — this is your app |

Everything environment-specific (URL, credentials, timeouts, browsers, log level) is read
from `.env.<TEST_ENV>` through a single validated `config` object. Nothing in the codebase
touches `process.env` directly, so a missing variable fails once with a message telling you
how to fix it — instead of surfacing as `undefined` three layers deep.

---

## Quick start

```bash
npm ci
npx playwright install --with-deps

cp .env.example .env.uat     # then edit BASE_URL + credentials
npm test
```

---

## Using it on a new project

1. **Copy the repo** (or just `src/core/`, `playwright.config.ts`, `tsconfig.json`,
   `eslint.config.mjs`).
2. **Point it at your app** — edit `.env.uat`:
   ```ini
   BASE_URL=https://your-app.example.com
   APP_USER_USERNAME=your.user@example.com
   APP_USER_PASSWORD=...
   ```
3. **Update the auth setup** — [tests/setup/auth.setup.ts](tests/setup/auth.setup.ts) drives
   your app's login once; every other test then starts already signed in.
4. **Add page objects** under `src/pages/`, extending `BasePage`.
5. **Register them as fixtures** in [src/fixtures/index.ts](src/fixtures/index.ts) — one line each.
6. **Write specs** in `tests/`, tagged `@smoke` or `@regression`.

Nothing under `src/core/` needs to change.

---

## Commands

| Command                     | What it does                                       |
| --------------------------- | -------------------------------------------------- |
| `npm test`                  | Run everything                                     |
| `npm run test:smoke`        | Only `@smoke`-tagged tests                         |
| `npm run test:regression`   | Only `@regression`-tagged tests                    |
| `npm run test:chromium`     | Single browser (fastest feedback)                  |
| `npm run test:ui`           | Playwright UI mode — time-travel debugging         |
| `npm run test:debug`        | Step through with the inspector                    |
| `npm run test:headed`       | Watch the browser                                  |
| `npm run test:live`         | Run against `.env.live`                            |
| `npm run report`            | Open the last HTML report                          |
| `npm run allure:serve`      | Open the Allure report                             |
| `npm run typecheck`         | `tsc --noEmit` — strict type checking              |
| `npm run lint` / `lint:fix` | ESLint incl. `eslint-plugin-playwright` rules      |
| `npm run format`            | Prettier                                           |
| `npm run verify`            | typecheck + lint + format check (what CI gates on) |
| `npm run clean`             | Delete all reports, traces and cached auth state   |

---

## Configuration

All settings live in `.env.<TEST_ENV>`; see [.env.example](.env.example) for the full list.

| Variable                                               | Default                             | Purpose                                |
| ------------------------------------------------------ | ----------------------------------- | -------------------------------------- |
| `TEST_ENV`                                             | `uat`                               | Which `.env` file to load              |
| `BASE_URL`                                             | _required_                          | App under test                         |
| `API_BASE_URL`                                         | `BASE_URL`                          | API tests                              |
| `APP_USER_USERNAME` / `_PASSWORD`                      | _required on login_                 | Standard account                       |
| `APP_ADMIN_USERNAME` / `_PASSWORD`                     | optional                            | Elevated account                       |
| `BROWSERS`                                             | `chromium` locally, all three in CI | Comma-separated browser list           |
| `TIMEOUT_TEST` / `_EXPECT` / `_ACTION` / `_NAVIGATION` | `60s`/`10s`/`15s`/`30s`             | Timeout budgets                        |
| `LOG_LEVEL`                                            | `info`                              | `error` \| `warn` \| `info` \| `debug` |
| `HEADED`                                               | `false`                             | Watch the browser locally              |

Credentials are resolved **lazily** — a project that never signs in as an admin doesn't
have to define admin credentials.

---

## Architecture

```
├── .github/workflows/playwright.yml  # quality gate → 4 sharded test jobs → merged report
├── playwright.config.ts              # timeouts, reporters, browser projects (from BROWSERS)
├── tsconfig.json                     # strict mode + @core/@pages/@fixtures/@data aliases
├── eslint.config.mjs                 # TS + Playwright lint rules
│
├── src/
│   ├── core/                         # ── REUSABLE FRAMEWORK ──
│   │   ├── base/BasePage.ts          #    action/assertion wrappers with test.step reporting
│   │   ├── config/env.ts             #    validated, typed configuration
│   │   └── utils/
│   │       ├── logger.ts             #    winston: console + JSON file transport
│   │       └── dates.ts              #    date helpers (no hardcoded calendar dates)
│   │
│   ├── pages/                        # ── PROJECT-SPECIFIC ──
│   │   ├── LoginPage.ts
│   │   └── AppointmentPage.ts
│   ├── fixtures/index.ts             #    page objects injected as fixtures
│   └── testdata/facilities.ts        #    non-secret test data
│
└── tests/
    ├── setup/auth.setup.ts           # logs in once → playwright/.auth/user.json
    ├── smoke/                        # @smoke — golden paths
    └── regression/                   # @regression — negative paths, data-driven cases
```

### Authentication is performed once

A `setup` project signs in through the UI and saves the browser state to
`playwright/.auth/user.json`. Every browser project declares `dependencies: ['setup']` and
loads that state, so tests begin authenticated instead of repeating a four-step UI login.

A spec that must run signed out opts back out explicitly:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

### Page objects report themselves

`BasePage` wrappers emit a named `test.step`, so the HTML and Allure reports read as a
legible sequence rather than a wall of raw actions — while still forwarding Playwright's
own options through:

```ts
await this.click(this.loginButton, { force: true });
// report: "Click button[type=\"submit\"]"
```

`BasePage.isVisible()` deliberately **waits** before answering, unlike Playwright's
non-retrying `locator.isVisible()`, which is a common source of flakiness.

---

## CI pipeline

1. **`quality`** — typecheck, lint and format check. Fails fast before any browser starts.
2. **`test`** — 4 parallel shards × 3 browsers, with the browser binaries cached on the
   Playwright version. Each shard emits a `blob` report.
3. **`report`** — merges the shards into one HTML report and publishes an Allure report
   (with run-over-run history) to GitHub Pages.

`workflow_dispatch` lets you trigger `all` / `smoke` / `regression` manually from the
Actions tab. `BASE_URL` comes from a repository **variable** and credentials from
repository **secrets**, so the workflow is reusable without edits.

---

## Conventions

- **Tag, don't rely on folders** — `test('...', { tag: ['@smoke'] }, ...)`. `--grep` filters on tags.
- **Never hardcode a calendar date** — use `daysFromToday()` / `nearFutureDateInCurrentMonth()`.
  A date that was "in the future" when written eventually rots.
- **Never commit credentials** — they belong in `.env.<TEST_ENV>` (gitignored) or CI secrets.
- **Assert everything you submitted**, not just one field. `expectConfirmationMatches()` checks
  facility, readmission, programme, date and comment — an earlier version checked only the
  facility, so a wrong date would have passed.

---

## Roadmap

- AI layer (`src/ai/`): self-healing locators, semantic assertions, AI failure triage in CI
- API testing via Playwright's `request` fixture
- Accessibility scans with `@axe-core/playwright`
- Visual regression with `toHaveScreenshot()`
