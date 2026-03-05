import { Router, Request, Response } from 'express';
import { AuditLogRepository } from '../repositories/auditLogRepository';
import { authMiddleware, adminOnlyMiddleware } from '../middleware/adminAuthMiddleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/audit-logs
 * Get all audit logs with optional filters (Admin only)
 * Query params: page, limit, userId, entityType, entityId, action, status, startDate, endDate
 */
router.get(
  '/',
  authMiddleware,
  adminOnlyMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const filters = {
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
        entityType: req.query.entityType ? (req.query.entityType as string) : undefined,
        entityId: req.query.entityId ? parseInt(req.query.entityId as string) : undefined,
        action: req.query.action ? (req.query.action as string) : undefined,
        status: req.query.status ? (req.query.status as string) : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const { logs, total } = await AuditLogRepository.getAuditLogs(limit, offset, filters);
      const pages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: logs,
        pagination: {
          total,
          page,
          limit,
          pages,
        },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs',
      });
    }
  })
);

/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity (Admin only)
 */
router.get(
  '/entity/:entityType/:entityId',
  authMiddleware,
  adminOnlyMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const entityType = Array.isArray(req.params.entityType) ? req.params.entityType[0] : req.params.entityType;
      const entityId = Array.isArray(req.params.entityId) ? req.params.entityId[0] : req.params.entityId;

      if (!entityType || !entityId) {
        res.status(400).json({
          success: false,
          error: 'Entity type and ID are required',
        });
        return;
      }

      const logs = await AuditLogRepository.getEntityAuditLogs(
        entityType,
        parseInt(entityId)
      );

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch entity audit logs',
      });
    }
  })
);

/**
 * GET /api/audit-logs/user/:userId
 * Get audit logs created by a specific user (Admin only)
 */
router.get(
  '/user/:userId',
  authMiddleware,
  adminOnlyMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const logs = await AuditLogRepository.getUserAuditLogs(parseInt(userId), limit);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user audit logs',
      });
    }
  })
);

/**
 * GET /api/audit-logs/user/:userId/status-history
 * Get user status change history (Admin only)
 */
router.get(
  '/user/:userId/status-history',
  authMiddleware,
  adminOnlyMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const history = await AuditLogRepository.getUserStatusHistory(parseInt(userId), limit);

      res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      console.error('Error fetching user status history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user status history',
      });
    }
  })
);

/**
 * GET /api/audit-logs/content/:contentType/:contentId/status-history
 * Get content status change history (Admin only)
 */
router.get(
  '/content/:contentType/:contentId/status-history',
  authMiddleware,
  adminOnlyMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const contentType = Array.isArray(req.params.contentType) ? req.params.contentType[0] : req.params.contentType;
      const contentId = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!contentType || !contentId) {
        res.status(400).json({
          success: false,
          error: 'Content type and ID are required',
        });
        return;
      }

      const history = await AuditLogRepository.getContentStatusHistory(
        contentType,
        parseInt(contentId),
        limit
      );

      res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      console.error('Error fetching content status history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content status history',
      });
    }
  })
);

/**
 * GET /api/audit-logs/activity-summary
 * Get activity summary for dashboard (Admin only)
 * Query params: daysBack (default: 7)
 */
router.get(
  '/activity-summary',
  authMiddleware,
  adminOnlyMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const daysBack = parseInt(req.query.daysBack as string) || 7;

      const summary = await AuditLogRepository.getActivitySummary(daysBack);

      res.json({
        success: true,
        data: summary,
        period: `Last ${daysBack} days`,
      });
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch activity summary',
      });
    }
  })
);

/**
 * GET /api/audit-logs/export
 * Export audit logs for compliance (Admin only)
 * Query params: startDate, endDate, entityType
 */
router.get(
  '/export',
  authMiddleware,
  adminOnlyMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, entityType } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
        return;
      }

      const logs = await AuditLogRepository.exportAuditLogs(
        new Date(startDate as string),
        new Date(endDate as string),
        entityType ? (entityType as string) : undefined
      );

      // Set response header for CSV/Excel download
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.json"');
      res.setHeader('Content-Type', 'application/json');

      res.json({
        success: true,
        data: logs,
        count: logs.length,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export audit logs',
      });
    }
  })
);

/**
 * POST /api/audit-logs/cleanup
 * Delete old audit logs (Admin only)
 * Body: { daysOld: number (default: 90) }
 */
router.post(
  '/cleanup',
  authMiddleware,
  adminOnlyMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { daysOld = 90 } = req.body;

      if (daysOld < 7) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete logs newer than 7 days for safety',
        });
        return;
      }

      const deletedCount = await AuditLogRepository.deleteOldLogs(daysOld);

      res.json({
        success: true,
        message: `Deleted ${deletedCount} old audit logs (older than ${daysOld} days)`,
        deletedCount,
      });
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup audit logs',
      });
    }
  })
);

export default router;
