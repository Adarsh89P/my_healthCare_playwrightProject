import { Locator, Page, expect } from '@playwright/test';

export class BasePage {

    constructor(protected page: Page) {}

    async navigate(url: string) {
        await this.page.goto(url);
    }

    async click(locator: Locator) {
        await locator.click();
    }

    async fill(locator: Locator, text: string) {
        await locator.fill(text);
    }

    async getText(locator: Locator) {
        return await locator.textContent();
    }

    async isVisible(locator: Locator) {
        return await locator.isVisible();
    }

    async waitForVisible(locator: Locator) {
        await locator.waitFor({
            state: 'visible'
        });
    }

    async expectVisible(locator: Locator) {
        await expect(locator).toBeVisible();
    }

    async expectText(locator: Locator, text: string) {
        await expect(locator).toHaveText(text);
    }

    async takeScreenshot(fileName: string = 'screenshot.png') {
        await this.page.screenshot({ path: fileName, fullPage: true });
    }

    async scrollIntoView(locator: Locator) {
        await locator.scrollIntoViewIfNeeded();
    }

    async selectDropdown(locator: Locator, value: string | number | { label?: string; value?: string; index?: number }) {
        await locator.selectOption(value as any);
    }

    async hover(locator: Locator) {
        await locator.hover();
    }

    async doubleClick(locator: Locator) {
        await locator.dblclick();
    }

    async rightClick(locator: Locator) {
        await locator.click({ button: 'right' });
    }

    async uploadFile(locator: Locator, filePath: string) {
        await locator.setInputFiles(filePath);
    }

    async waitForLoader(locator: Locator, timeout: number = 30000) {
        try {
            await locator.waitFor({ state: 'visible', timeout });
            await locator.waitFor({ state: 'hidden', timeout });
        } catch {
            // Ignore if loader is already gone or not present.
        }
    }
}