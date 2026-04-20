import { Request, Response } from 'express';
import { StorageCleanupService } from './storage-cleanup.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export class StorageCleanupController {
  static async runCleanup(req: Request, res: Response) {
    try {
      const dryRun = req.query.dryRun !== 'false';
      const gracePeriodDays = req.query.graceDays ? parseInt(req.query.graceDays as string, 10) : 7;

      const result = await StorageCleanupService.cleanupOrphanedFiles({ dryRun, gracePeriodDays });

      return res.status(200).json(successResponse(result, dryRun ? 'Dry run completed' : 'Cleanup completed'));
    } catch (err: any) {
      console.error('Storage cleanup error:', err);
      return res.status(500).json(errorResponse(err.message || 'Storage cleanup failed'));
    }
  }
}
