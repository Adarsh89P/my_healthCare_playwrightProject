import winston from 'winston';
import { config } from '@core/config/env';

/**
 * Shared logger.
 *
 * Console output is human-readable; a full JSON copy is written to
 * `test-results/logs/` so a CI run can be inspected after the fact without
 * scrolling through the job log.
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${message}${extra}`;
  })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: 'test-results/logs/test-run.log',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      // Never let a logging failure take a test run down with it.
      handleExceptions: false,
    }),
  ],
});
