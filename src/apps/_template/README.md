# Application template

Copy this folder to onboard a new application. Nothing in `src/core` or `src/ai` needs to change.

## Steps

1. **Copy the folder.** `cp -r src/apps/_template src/apps/<your-app>`
2. **Create the test folder.** `mkdir -p tests/<your-app>/{smoke,regression,setup}`
3. **Point at the app.** Add `BASE_URL` and credentials to `.env.<TEST_ENV>` — see `.env.example`.
   No URL is ever hard-coded in code.
4. **Declare the routes** in `config.ts`. This file holds only the app's route shape; everything
   environment-specific stays in `.env`.
5. **Write page objects** under `pages/`, each extending `@core/base/BasePage` for the shared
   helpers (`click`, `fill`, `expectVisible`, …). Those wrappers emit `test.step` entries and route
   through the optional self-healing hook.
6. **Expose them as fixtures** in `fixtures/index.ts`, which extends `@core/fixtures/base` so the
   app inherits the optional AI layer automatically.
7. **Run it.** `APP=<your-app> npm test`

## Conventions

- Specs import only `@apps/<your-app>/fixtures/index` — never a page class directly, and never `new`.
- Tag tests `@smoke` or `@regression` so `npm run test:smoke` stays meaningful.
- Put a `*.setup.ts` in `tests/<your-app>/setup/` if the app needs authentication; the `setup`
  project picks it up by filename and every browser project depends on it.
