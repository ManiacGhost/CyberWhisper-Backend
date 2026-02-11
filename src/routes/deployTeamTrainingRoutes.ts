import { Router, Request, Response } from 'express';
import { DeployTeamTrainingRepository } from '../repositories/deployTeamTrainingRepository';
import { DeployTeamTrainingResponse, DeployTeamTraining } from '../types/deployTeamTraining';
import { authMiddleware, adminOnlyMiddleware, AuthRequest } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * POST /api/deploy-team-training/add - Create a new training request
 * Body: Training request data (full_name, work_email, phone_whatsapp, etc.)
 */
router.post('/add', async (req: Request, res: Response) => {
  try {
    const requestData = req.body as Omit<
      DeployTeamTraining,
      'id' | 'created_at' | 'updated_at'
    >;

    // Validate required fields
    const requiredFields = [
      'full_name',
      'work_email',
      'phone_whatsapp',
      'company_name',
      'job_title',
      'team_size',
      'delivery_mode',
      'timeline',
      'track_certification',
      'message_requirement',
    ];

    const missingFields = requiredFields.filter((field) => !requestData[field as keyof typeof requestData]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestData.work_email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const newRequest = await DeployTeamTrainingRepository.createRequest(requestData);

    const response: DeployTeamTrainingResponse = {
      success: true,
      message: 'Training request created successfully',
      data: newRequest,
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating training request:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create training request',
    });
  }
});

/**
 * GET /api/deploy-team-training - Get all training requests with pagination
 * Query params: page (default: 1), limit (default: 10), company_name, delivery_mode
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      company_name: req.query.company_name as string | undefined,
      delivery_mode: req.query.delivery_mode as string | undefined,
    };

    const { requests, total } = await DeployTeamTrainingRepository.getAllRequests(
      limit,
      offset,
      filters
    );
    const pages = Math.ceil(total / limit);

    const response: DeployTeamTrainingResponse = {
      success: true,
      data: requests,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching training requests:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch training requests',
    });
  }
});

/**
 * GET /api/deploy-team-training/:id - Get single training request
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request ID',
      });
    }

    const request = await DeployTeamTrainingRepository.getRequestById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Training request not found',
      });
    }

    const response: DeployTeamTrainingResponse = {
      success: true,
      data: request,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching training request:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch training request',
    });
  }
});

/**
 * GET /api/deploy-team-training/company/:companyName - Get requests by company
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/company/:companyName', async (req: Request, res: Response) => {
  try {
    const companyName = req.params.companyName as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { requests, total } = await DeployTeamTrainingRepository.getRequestsByCompany(
      companyName,
      limit,
      offset
    );
    const pages = Math.ceil(total / limit);

    const response: DeployTeamTrainingResponse = {
      success: true,
      data: requests,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching requests by company:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch requests by company',
    });
  }
});

/**
 * GET /api/deploy-team-training/mode/:deliveryMode - Get requests by delivery mode
 * Query params: page (default: 1), limit (default: 10)
 */
router.get('/mode/:deliveryMode', async (req: Request, res: Response) => {
  try {
    const deliveryMode = req.params.deliveryMode as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { requests, total } = await DeployTeamTrainingRepository.getRequestsByDeliveryMode(
      deliveryMode,
      limit,
      offset
    );
    const pages = Math.ceil(total / limit);

    const response: DeployTeamTrainingResponse = {
      success: true,
      data: requests,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching requests by delivery mode:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch requests by delivery mode',
    });
  }
});

/**
 * PUT /api/deploy-team-training/update/:id - Update a training request (Admin only)
 * Body: Partial training request data to update
 */
router.put(
  '/update/:id',
  authMiddleware,
  adminOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request ID',
        });
      }

      const requestData = req.body as Partial<
        Omit<DeployTeamTraining, 'id' | 'created_at' | 'updated_at'>
      >;

      // Validate email if provided
      if (requestData.work_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(requestData.work_email)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid email format',
          });
        }
      }

      const updatedRequest = await DeployTeamTrainingRepository.updateRequest(id, requestData);

      if (!updatedRequest) {
        return res.status(404).json({
          success: false,
          error: 'Training request not found',
        });
      }

      const response: DeployTeamTrainingResponse = {
        success: true,
        message: 'Training request updated successfully',
        data: updatedRequest,
      };

      return res.json(response);
    } catch (error) {
      console.error('Error updating training request:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update training request',
      });
    }
  }
);

/**
 * DELETE /api/deploy-team-training/delete/:id - Delete a training request (Admin only)
 */
router.delete(
  '/delete/:id',
  authMiddleware,
  adminOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request ID',
        });
      }

      const deleted = await DeployTeamTrainingRepository.deleteRequest(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Training request not found',
        });
      }

      const response: DeployTeamTrainingResponse = {
        success: true,
        message: 'Training request deleted successfully',
      };

      return res.json(response);
    } catch (error) {
      console.error('Error deleting training request:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete training request',
      });
    }
  }
);

export default router;
