import { Page } from '@playwright/test';
import { BasePage } from '@core/base/BasePage';
import { ROUTES } from '../config';

/**
 * Starting point for a new application's first page object.
 *
 * Extend `BasePage` so every action is wrapped in a `test.step` (readable
 * reports) and routed through the optional self-healing hook.
 */
export class ExamplePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // TODO: replace with your application's real locators. Prefer role- and
  // label-based locators over CSS - they survive markup changes.
  readonly heading = this.page.getByRole('heading', { level: 1 });

  async open(): Promise<void> {
    await this.navigate(ROUTES.home);
  }

  async expectLoaded(): Promise<void> {
    await this.expectVisible(this.heading);
  }
}
