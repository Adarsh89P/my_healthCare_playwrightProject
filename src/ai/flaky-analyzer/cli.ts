#!/usr/bin/env node
/**
 * Flakiness analyzer (CLI).
 *
 *   npm run ai:flaky -- --input ./ci-runs        # dir of Playwright JSON reports
 *   npm run ai:flaky -- --input ./ci-runs --out test-results/ai/flaky-report.md
 *
 * Aggregation is deterministic and runs with AI switched off. When AI is
 * enabled it additionally asks for a probable cause per flaky test.
 *
 * Produce the input files with Playwright's JSON reporter, one per CI run:
 *   PLAYWRIGHT_JSON_OUTPUT_NAME=run-42.json npx playwright test --reporter=json
 */
import { askForJson, describeSkip } from '@ai/client';
import { aiConfig } from '@ai/config';
import { isRecord, truncate } from '@ai/parse';
import { analyzeRuns, PlaywrightJsonReport, renderFlakyReport } from '@ai/flaky-analyzer/analyze';
import { parseArgs } from '@ai/test-generator/cli';
import { FlakyAnalysis } from '@ai/types';
import fs from 'fs';
import path from 'path';

const SYSTEM_PROMPT = `You analyse intermittently failing end-to-end tests.

For each test, give the single most probable cause in one or two sentences,
drawn from the error samples and the failure rate. Prefer concrete mechanisms -
a race between navigation and assertion, shared state across workers, a
time-dependent fixture, an unstable third-party dependency - over generic
advice like "add a wait". If the evidence does not support a specific cause,
say that plainly instead of guessing.`;

const SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    causes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          cause: { type: 'string' },
        },
        required: ['title', 'cause'],
        additionalProperties: false,
      },
    },
  },
  required: ['causes'],
  additionalProperties: false,
};

/** Reads every *.json in a directory as a Playwright JSON report. */
export function loadReports(inputDir: string): PlaywrightJsonReport[] {
  const dir = path.resolve(process.cwd(), inputDir);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .flatMap((name) => {
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf-8'));
        return isRecord(parsed) ? [parsed as PlaywrightJsonReport] : [];
      } catch {
        console.warn(`Skipping unreadable report: ${name}`);
        return [];
      }
    });
}

async function addProbableCauses(analysis: FlakyAnalysis): Promise<void> {
  if (!aiConfig.enabled || analysis.flaky.length === 0) return;

  const prompt = analysis.flaky
    .slice(0, 20)
    .map((record) =>
      [
        `Test: ${record.title}`,
        `Failed ${record.failures} of ${record.runs} runs (${(record.failureRate * 100).toFixed(0)}%)`,
        record.errorSamples.length > 0
          ? `Errors:\n${record.errorSamples.map((e) => truncate(e, 500)).join('\n---\n')}`
          : 'No error text captured.',
      ].join('\n')
    )
    .join('\n\n====\n\n');

  const response = await askForJson({
    system: SYSTEM_PROMPT,
    prompt,
    schema: SCHEMA,
    maxTokens: 8_000,
  });
  if (!response.ok) {
    console.warn(`Probable-cause analysis skipped: ${describeSkip(response.reason)}`);
    return;
  }

  const raw = response.data['causes'];
  if (!Array.isArray(raw)) return;

  const causes: Record<string, string> = {};
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const title = item['title'];
    const cause = item['cause'];
    if (typeof title === 'string' && typeof cause === 'string') causes[title] = cause;
  }

  if (Object.keys(causes).length > 0) analysis.probableCauses = causes;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const input = args['input'] ?? 'ci-runs';

  const reports = loadReports(input);
  if (reports.length === 0) {
    console.error(`No JSON reports found in "${input}".`);
    console.error(
      'Generate them with: PLAYWRIGHT_JSON_OUTPUT_NAME=run-1.json npx playwright test --reporter=json'
    );
    return 1;
  }

  const analysis = analyzeRuns(reports);
  await addProbableCauses(analysis);

  const outPath = path.resolve(
    process.cwd(),
    args['out'] ?? path.join(aiConfig.outputDir, 'flaky-report.md')
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderFlakyReport(analysis), 'utf-8');

  console.log(`Analysed ${analysis.totalRuns} run(s); ${analysis.flaky.length} flaky test(s).`);
  console.log(`Report: ${path.relative(process.cwd(), outPath)}`);
  return 0;
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
