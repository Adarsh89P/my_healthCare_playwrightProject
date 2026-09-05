import { test as base, expect } from '@core/fixtures/base';
import { ExamplePage } from '../pages/ExamplePage';

/** Template fixtures. Add one line per page object. */
export interface Pages {
  examplePage: ExamplePage;
}

export const test = base.extend<Pages>({
  examplePage: async ({ page }, use) => {
    await use(new ExamplePage(page));
  },
});

export { expect };
