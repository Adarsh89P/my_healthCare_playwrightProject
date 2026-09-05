import { expect, test } from '@playwright/test';
import {
  analyzeRuns,
  extractOutcomes,
  flakinessScore,
  PlaywrightJsonReport,
  renderFlakyReport,
} from '@ai/flaky-analyzer/analyze';

/** Builds a minimal Playwright JSON report for one run. */
function report(
  ...specs: { title: string; status: string; error?: string }[]
): PlaywrightJsonReport {
  return {
    suites: [
      {
        title: 'suite',
        specs: specs.map((spec) => ({
          title: spec.title,
          tests: [
            {
              results: [
                { status: spec.status, error: spec.error ? { message: spec.error } : undefined },
              ],
            },
          ],
        })),
      },
    ],
  };
}

test.describe('flakinessScore', () => {
  test('peaks at a 50/50 split', () => {
    expect(flakinessScore(5, 10)).toBe(1);
  });

  test('is zero when a test always passes', () => {
    expect(flakinessScore(0, 10)).toBe(0);
  });

  test('is zero when a test always fails - broken, not flaky', () => {
    expect(flakinessScore(10, 10)).toBe(0);
  });

  test('is symmetric around the midpoint', () => {
    expect(flakinessScore(2, 10)).toBe(flakinessScore(8, 10));
  });

  test('handles zero runs without dividing by zero', () => {
    expect(flakinessScore(0, 0)).toBe(0);
  });
});

test.describe('extractOutcomes', () => {
  test('flattens nested suites into fully-qualified titles', () => {
    const nested: PlaywrightJsonReport = {
      suites: [
        {
          title: 'outer',
          suites: [
            {
              title: 'inner',
              specs: [{ title: 'does a thing', tests: [{ results: [{ status: 'passed' }] }] }],
            },
          ],
        },
      ],
    };

    expect(extractOutcomes(nested)).toEqual([
      { title: 'outer › inner › does a thing', passed: true, error: undefined },
    ]);
  });

  test('uses the final attempt as the verdict, so a passing retry counts as a pass', () => {
    const retried: PlaywrightJsonReport = {
      suites: [
        {
          title: 's',
          specs: [
            {
              title: 'eventually passes',
              tests: [
                {
                  results: [{ status: 'failed', error: { message: 'boom' } }, { status: 'passed' }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(extractOutcomes(retried)[0]?.passed).toBe(true);
  });

  test('returns nothing for an empty report', () => {
    expect(extractOutcomes({})).toEqual([]);
  });
});

test.describe('analyzeRuns', () => {
  test('flags a test that fails intermittently', () => {
    const analysis = analyzeRuns([
      report({ title: 'checkout', status: 'passed' }),
      report({ title: 'checkout', status: 'failed', error: 'timeout' }),
      report({ title: 'checkout', status: 'passed' }),
    ]);

    expect(analysis.totalRuns).toBe(3);
    expect(analysis.flaky).toHaveLength(1);
    expect(analysis.flaky[0]?.failures).toBe(1);
    expect(analysis.flaky[0]?.errorSamples).toEqual(['timeout']);
  });

  test('excludes always-passing and always-failing tests', () => {
    const analysis = analyzeRuns([
      report(
        { title: 'stable', status: 'passed' },
        { title: 'broken', status: 'failed', error: 'x' }
      ),
      report(
        { title: 'stable', status: 'passed' },
        { title: 'broken', status: 'failed', error: 'x' }
      ),
    ]);

    expect(analysis.flaky).toHaveLength(0);
  });

  test('ranks the most unstable test first', () => {
    const runs = [
      report({ title: 'coinflip', status: 'passed' }, { title: 'rare', status: 'passed' }),
      report(
        { title: 'coinflip', status: 'failed', error: 'a' },
        { title: 'rare', status: 'passed' }
      ),
      report({ title: 'coinflip', status: 'passed' }, { title: 'rare', status: 'passed' }),
      report(
        { title: 'coinflip', status: 'failed', error: 'b' },
        { title: 'rare', status: 'failed', error: 'c' }
      ),
    ];

    const analysis = analyzeRuns(runs);
    expect(analysis.flaky[0]?.title).toContain('coinflip');
  });

  test('caps stored error samples at three', () => {
    const runs = Array.from({ length: 6 }, (_, i) =>
      report({ title: 'noisy', status: i % 2 === 0 ? 'passed' : 'failed', error: `err-${i}` })
    );

    expect(analyzeRuns(runs).flaky[0]?.errorSamples.length).toBeLessThanOrEqual(3);
  });
});

test.describe('renderFlakyReport', () => {
  test('states plainly when nothing is flaky', () => {
    const markdown = renderFlakyReport({ totalRuns: 5, flaky: [] });
    expect(markdown).toContain('No flaky tests detected');
  });

  test('renders a table and prompts for AI when causes are absent', () => {
    const markdown = renderFlakyReport(
      analyzeRuns([
        report({ title: 'x', status: 'passed' }),
        report({ title: 'x', status: 'failed', error: 'e' }),
      ])
    );

    expect(markdown).toContain('| Test | Failures | Failure rate | Flakiness |');
    expect(markdown).toContain('AI_ENABLED=true');
  });

  test('includes probable causes when present and labels them advisory', () => {
    const markdown = renderFlakyReport({
      totalRuns: 2,
      flaky: [
        { title: 'x', runs: 2, failures: 1, failureRate: 0.5, flakinessScore: 1, errorSamples: [] },
      ],
      probableCauses: { x: 'Race between navigation and assertion.' },
    });

    expect(markdown).toContain('Race between navigation and assertion.');
    expect(markdown).toContain('Advisory only');
  });
});
