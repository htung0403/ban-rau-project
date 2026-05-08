#!/usr/bin/env node
/**
 * CLI script to run daily delivery image sends to Zalo.
 * Usage:
 *   node server/scripts/dailySendDeliveryImages.ts [--date YYYY-MM-DD]
 *
 * Examples:
 *   node server/scripts/dailySendDeliveryImages.ts          # Run for today
 *   node server/scripts/dailySendDeliveryImages.ts --date 2026-05-07  # Run for specific date
 *
 * Deploy with cron (Linux):
 *   0 8 * * * cd /path/to/app && node server/scripts/dailySendDeliveryImages.ts >> /var/log/zalo-send.log 2>&1
 *
 * Deploy with cloud scheduler (Google Cloud):
 *   Set HTTP trigger to POST https://your-app.com/api/admin/trigger-daily-send
 *   with optional body { "date": "2026-05-07" }
 */

import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../src/utils/logger';
import { dailySendService } from '../src/modules/notifications/daily-send.service';

// Load .env if running locally
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const args = process.argv.slice(2);
  let targetDate: string | undefined;

  // Parse --date argument
  const dateIndex = args.indexOf('--date');
  if (dateIndex !== -1 && dateIndex + 1 < args.length) {
    targetDate = args[dateIndex + 1];

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      logger.error('Invalid date format. Use YYYY-MM-DD');
      process.exit(1);
    }
  }

  try {
    logger.info('Starting daily delivery image send...');

    const result = await dailySendService.runDailySend(targetDate);

    logger.info(
      `Daily send completed: total=${result.total}, sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`,
    );

    // Exit with code 0 if all succeeded or at least some sent; non-zero if all failed
    if (result.sent > 0 || result.skipped > 0) {
      process.exit(0);
    } else if (result.failed > 0) {
      logger.error('All sends failed. Please check logs and retry manually.');
      process.exit(1);
    } else {
      logger.info('No deliveries to send.');
      process.exit(0);
    }
  } catch (err) {
    logger.error('Fatal error in daily send script:', err);
    process.exit(1);
  }
}

main();
