# Adding a new project/app to this framework

This folder is a starter scaffold. To stand up a new app (e.g. `ecommerce`):

1. **Copy this folder** to `src/apps/<newapp>/` and rename `ExamplePage.ts`, `fixture.ts`, `example.json` to match your app.
2. **Fill in `config.ts`** — set the real `baseUrl` per environment tier, and read any credentials from `process.env`.
3. **Add credentials to `.env.example`** (documented, no real values) and your local `.env` (real values, gitignored).
4. **Write page objects** under `pages/`, each extending `@core/pages/BasePage` for the shared helpers (`click`, `fill`, `expectVisible`, etc).
5. **Register page objects as fixtures** in `fixtures/fixture.ts`, following the pattern in `src/apps/healthcare/fixtures/fixture.ts`.
6. **Create `tests/<newapp>/smoke/...spec.ts`**, importing `test` from your new fixture file, `currentEnv`/`credentials` from your config, and tag tests `@smoke` / `@regression`.
7. **Wire it into CI** — add `<newapp>` to the `matrix.app` list in `.github/workflows/playwright.yml` (both jobs).
8. **Add npm scripts** in `package.json`, mirroring the `test:healthcare*` scripts, e.g.:
   ```json
   "test:<newapp>": "cross-env APP=<newapp> playwright test",
   "test:<newapp>:smoke": "cross-env APP=<newapp> playwright test --grep @smoke"
   ```

To run tests against your new app locally: `cross-env APP=<newapp> npx playwright test` (or use the npm script from step 8). The `APP` env var controls which `tests/<app>` directory Playwright picks up — see `testDir` in `playwright.config.ts`.
