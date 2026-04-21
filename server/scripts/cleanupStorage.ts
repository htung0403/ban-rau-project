import { StorageCleanupService } from '../src/modules/upload/storage-cleanup.service.js';

const args = process.argv.slice(2);
const dryRun = !args.includes('--confirm');
const graceDaysArg = args.find(a => a.startsWith('--grace-days='));
const gracePeriodDays = graceDaysArg ? parseInt(graceDaysArg.split('=')[1], 10) : 7;

async function run() {
  console.log('=== Storage Cleanup ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (pass --confirm to actually delete)' : 'LIVE DELETE'}`);
  console.log(`Grace period: ${gracePeriodDays} days\n`);

  try {
    const result = await StorageCleanupService.cleanupOrphanedFiles({ dryRun, gracePeriodDays });

    for (const line of result.details) {
      console.log(line);
    }

    console.log('\n--- Summary ---');
    console.log(`Orphaned URLs found: ${result.totalOrphanedUrls}`);
    console.log(`Files ${dryRun ? 'would be' : ''} deleted: ${result.deletedFiles}`);
    console.log(`Skipped (still referenced): ${result.skippedActiveRefs}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      for (const e of result.errors) {
        console.log(`  ${e.url}: ${e.error}`);
      }
    }
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

run();
