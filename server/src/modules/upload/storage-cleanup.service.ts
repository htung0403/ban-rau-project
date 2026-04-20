import { supabaseService } from '../../config/supabase.js';

interface CleanupResult {
  totalOrphanedUrls: number;
  deletedFiles: number;
  errors: { url: string; error: string }[];
  skippedActiveRefs: number;
  dryRun: boolean;
  details: string[];
}

interface ParsedStorageUrl {
  bucket: string;
  path: string;
}

export class StorageCleanupService {
  /**
   * Parse a Supabase Storage public URL into bucket + path.
   * Format: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
   */
  static parseStorageUrl(url: string): ParsedStorageUrl | null {
    try {
      const marker = '/storage/v1/object/public/';
      const idx = url.indexOf(marker);
      if (idx === -1) return null;

      const afterMarker = url.substring(idx + marker.length);
      const slashIdx = afterMarker.indexOf('/');
      if (slashIdx === -1) return null;

      return {
        bucket: decodeURIComponent(afterMarker.substring(0, slashIdx)),
        path: decodeURIComponent(afterMarker.substring(slashIdx + 1)),
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract all image URLs from a field that may be:
   * - a single URL string
   * - comma-separated URLs (import_order_items.image_url stores this way)
   * - null/undefined
   */
  static extractUrls(value: string | null | undefined): string[] {
    if (!value) return [];
    return value.split(',').map(u => u.trim()).filter(Boolean);
  }

  /**
   * Collect all image URLs referenced by soft-deleted import/vegetable orders.
   * Only includes orders deleted longer than `gracePeriodDays` ago.
   */
  static async collectSoftDeletedUrls(gracePeriodDays = 7): Promise<string[]> {
    const urls: string[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);
    const cutoff = cutoffDate.toISOString();

    const { data: deletedImports } = await supabaseService
      .from('import_orders')
      .select('id, receipt_image_url')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff);

    if (deletedImports) {
      for (const order of deletedImports) {
        urls.push(...this.extractUrls(order.receipt_image_url));
      }

      const ids = deletedImports.map((o: any) => o.id);
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { data: items } = await supabaseService
          .from('import_order_items')
          .select('image_url, image_urls')
          .in('import_order_id', batch);

        if (items) {
          for (const item of items) {
            urls.push(...this.extractUrls(item.image_url));
            if (Array.isArray(item.image_urls)) {
              urls.push(...item.image_urls.filter(Boolean));
            }
          }
        }
      }
    }

    const { data: deletedVegs } = await supabaseService
      .from('vegetable_orders')
      .select('id, receipt_image_url')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff);

    if (deletedVegs) {
      for (const order of deletedVegs) {
        urls.push(...this.extractUrls(order.receipt_image_url));
      }

      const ids = deletedVegs.map((o: any) => o.id);
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { data: items } = await supabaseService
          .from('vegetable_order_items')
          .select('image_url, image_urls')
          .in('vegetable_order_id', batch);

        if (items) {
          for (const item of items) {
            urls.push(...this.extractUrls(item.image_url));
            if (Array.isArray(item.image_urls)) {
              urls.push(...item.image_urls.filter(Boolean));
            }
          }
        }
      }
    }

    return [...new Set(urls)];
  }

  /**
   * Collect ALL image URLs that are still actively referenced by non-deleted records.
   * Any URL in this set must NOT be deleted from storage.
   */
  static async collectActiveUrls(): Promise<Set<string>> {
    const urls = new Set<string>();
    const add = (values: string[]) => { for (const v of values) urls.add(v); };

    const { data: activeImports } = await supabaseService
      .from('import_orders')
      .select('id, receipt_image_url')
      .is('deleted_at', null);

    if (activeImports) {
      for (const o of activeImports) add(this.extractUrls(o.receipt_image_url));

      const ids = activeImports.map((o: any) => o.id);
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { data: items } = await supabaseService
          .from('import_order_items')
          .select('image_url, image_urls')
          .in('import_order_id', batch);
        if (items) {
          for (const item of items) {
            add(this.extractUrls(item.image_url));
            if (Array.isArray(item.image_urls)) add(item.image_urls.filter(Boolean));
          }
        }
      }
    }

    const { data: activeVegs } = await supabaseService
      .from('vegetable_orders')
      .select('id, receipt_image_url')
      .is('deleted_at', null);

    if (activeVegs) {
      for (const o of activeVegs) add(this.extractUrls(o.receipt_image_url));

      const ids = activeVegs.map((o: any) => o.id);
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { data: items } = await supabaseService
          .from('vegetable_order_items')
          .select('image_url, image_urls')
          .in('vegetable_order_id', batch);
        if (items) {
          for (const item of items) {
            add(this.extractUrls(item.image_url));
            if (Array.isArray(item.image_urls)) add(item.image_urls.filter(Boolean));
          }
        }
      }
    }

    const { data: payments } = await supabaseService
      .from('payment_collections')
      .select('image_url');
    if (payments) {
      for (const pc of payments) add(this.extractUrls(pc.image_url));
    }

    const { data: exports } = await supabaseService
      .from('export_orders')
      .select('image_url');
    if (exports) {
      for (const eo of exports) add(this.extractUrls(eo.image_url));
    }

    return urls;
  }

  /**
   * Main cleanup entry point.
   * @param dryRun   – true (default): only report; false: actually delete files
   * @param gracePeriodDays – days after soft-delete before files are eligible (default 7)
   */
  static async cleanupOrphanedFiles(options?: {
    dryRun?: boolean;
    gracePeriodDays?: number;
  }): Promise<CleanupResult> {
    const dryRun = options?.dryRun ?? true;
    const gracePeriodDays = options?.gracePeriodDays ?? 7;

    const result: CleanupResult = {
      totalOrphanedUrls: 0,
      deletedFiles: 0,
      errors: [],
      skippedActiveRefs: 0,
      dryRun,
      details: [],
    };

    const softDeletedUrls = await this.collectSoftDeletedUrls(gracePeriodDays);
    result.details.push(
      `Found ${softDeletedUrls.length} unique URL(s) from soft-deleted orders (grace: ${gracePeriodDays} days)`,
    );

    if (softDeletedUrls.length === 0) {
      result.details.push('No orphaned files to clean up.');
      return result;
    }

    const activeUrls = await this.collectActiveUrls();
    result.details.push(`Found ${activeUrls.size} actively-referenced URL(s)`);

    const orphanedUrls = softDeletedUrls.filter(url => {
      if (activeUrls.has(url)) {
        result.skippedActiveRefs++;
        return false;
      }
      return true;
    });

    result.totalOrphanedUrls = orphanedUrls.length;
    result.details.push(
      `${orphanedUrls.length} orphaned URL(s) to delete (${result.skippedActiveRefs} skipped – still referenced)`,
    );

    if (orphanedUrls.length === 0) {
      result.details.push('All files from soft-deleted orders are still referenced by active records.');
      return result;
    }

    const bucketFiles = new Map<string, string[]>();
    for (const url of orphanedUrls) {
      const parsed = this.parseStorageUrl(url);
      if (!parsed) {
        result.errors.push({ url, error: 'Could not parse storage URL' });
        continue;
      }
      const list = bucketFiles.get(parsed.bucket) || [];
      list.push(parsed.path);
      bucketFiles.set(parsed.bucket, list);
    }

    for (const [bucket, paths] of bucketFiles) {
      if (dryRun) {
        result.details.push(`[DRY RUN] Would delete ${paths.length} file(s) from bucket "${bucket}":`);
        for (const p of paths) result.details.push(`  - ${p}`);
        result.deletedFiles += paths.length;
      } else {
        for (let i = 0; i < paths.length; i += 100) {
          const batch = paths.slice(i, i + 100);
          const { error } = await supabaseService.storage.from(bucket).remove(batch);

          if (error) {
            for (const p of batch) {
              result.errors.push({ url: `${bucket}/${p}`, error: error.message });
            }
          } else {
            result.deletedFiles += batch.length;
            result.details.push(`Deleted ${batch.length} file(s) from bucket "${bucket}"`);
          }
        }
      }
    }

    return result;
  }
}
