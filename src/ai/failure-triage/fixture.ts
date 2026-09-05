import { Page, TestInfo } from '@playwright/test';
import { aiConfig } from '@ai/config';
import { pruneDom } from '@ai/parse';
import { renderVerdict, triageFailure } from '@ai/failure-triage/triage';
import { FailureContext } from '@ai/types';
import { logger } from '@core/utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Attaches an AI triage verdict to a failed test.
 *
 * Runs after the test body, only when the test actually failed and only when
 * `AI_TRIAGE` is on. The attachment lands in both the Playwright HTML report
 * and Allure. Any error in here is swallowed - triage must never turn a
 * reported failure into a different, more confusing failure.
 */
export async function attachTriage(page: Page | undefined, testInfo: TestInfo): Promise<void> {
  const failed = testInfo.status !== testInfo.expectedStatus;
  if (!failed || !aiConfig.triageEnabled) return;

  try {
    const context: FailureContext = {
      testTitle: testInfo.title,
      filePath: path.relative(process.cwd(), testInfo.file),
      projectName: testInfo.project.name,
      errorMessage: testInfo.error?.message ?? 'Unknown error',
      stack: testInfo.error?.stack,
      domSnapshot: await captureDom(page),
      retryIndex: testInfo.retry,
      durationMs: testInfo.duration,
    };

    const result = await triageFailure(context);
    if (!result.ok) {
      logger.debug(`AI triage skipped: ${result.reason}`);
      return;
    }

    await testInfo.attach('ai-triage.md', {
      body: renderVerdict(result.data),
      contentType: 'text/markdown',
    });

    recordVerdict(testInfo, result.data.category, result.data.confidence);
    logger.info(`AI triage: ${testInfo.title} -> ${result.data.category}`);
  } catch (error) {
    logger.debug(`AI triage errored, ignoring: ${String(error)}`);
  }
}

/** The page may already be closed by the time we get here; that is fine. */
async function captureDom(page: Page | undefined): Promise<string | undefined> {
  if (!page || page.isClosed()) return undefined;
  try {
    return pruneDom(await page.content());
  } catch {
    return undefined;
  }
}

/**
 * Appends the verdict to a run-level JSON file so CI can summarise all
 * failures at once without re-reading every attachment.
 */
function recordVerdict(testInfo: TestInfo, category: string, confidence: number): void {
  try {
    const dir = path.resolve(process.cwd(), aiConfig.outputDir);
    fs.mkdirSync(dir, { recursive: true });

    const file = path.join(dir, 'triage-report.jsonl');
    const entry = {
      timestamp: new Date().toISOString(),
      test: testInfo.title,
      project: testInfo.project.name,
      retry: testInfo.retry,
      category,
      confidence,
    };
    // JSON Lines: append-only, so parallel workers cannot corrupt each other.
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch {
    // Reporting is best-effort.
  }
}
