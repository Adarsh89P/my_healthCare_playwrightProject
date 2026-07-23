import { test as base } from '@playwright/test';
import { ExamplePage } from '../pages/ExamplePage';

type TemplateFixtures = {
    examplePage: ExamplePage;
};

export const test = base.extend<TemplateFixtures>({
    examplePage: async ({ page }, use) => {
        await use(new ExamplePage(page));
    },
});

export { expect } from '@playwright/test';
