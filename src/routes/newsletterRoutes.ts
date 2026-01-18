import { Router, Request, Response } from 'express';
import { NewsletterRepository } from '../repositories/newsletterRepository';
import { asyncHandler } from '../middleware/errorHandler';
import { SubscribeRequest, ListSubscribersResponse, NewsletterResponse } from '../types/newsletter';

const router = Router();

/**
 * POST /api/newsletter/subscribe
 * Subscribe an email to the newsletter
 */
router.post(
  '/subscribe',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as SubscribeRequest;

    // Validation
    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    try {
      // Check if already subscribed
      const isAlreadySubscribed = await NewsletterRepository.isSubscribed(email);

      const subscriber = await NewsletterRepository.subscribe({
        email: email.toLowerCase(),
      });

      const message = isAlreadySubscribed
        ? 'Email already subscribed to newsletter'
        : 'Successfully subscribed to newsletter';

      res.status(isAlreadySubscribed ? 200 : 201).json({
        success: true,
        message,
        data: subscriber,
      } as NewsletterResponse);
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to subscribe to newsletter',
      });
    }
  })
);

/**
 * GET /api/newsletter/subscribers
 * Get all newsletter subscribers (paginated)
 */
router.get(
  '/subscribers',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 100',
        });
        return;
      }

      if (offset < 0) {
        res.status(400).json({
          success: false,
          error: 'Offset must be non-negative',
        });
        return;
      }

      const { data, total } = await NewsletterRepository.getAllSubscribers(limit, offset);

      res.status(200).json({
        success: true,
        data,
        total,
        limit,
        offset,
      } as ListSubscribersResponse);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscribers',
      });
    }
  })
);

/**
 * GET /api/newsletter/check/:email
 * Check if an email is subscribed to the newsletter
 */
router.get(
  '/check/:email',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.params;

    try {
      const subscriber = await NewsletterRepository.getByEmail(email);

      res.status(200).json({
        success: true,
        data: {
          email,
          isSubscribed: subscriber !== null,
          subscribedAt: subscriber?.created_at || null,
        },
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check subscription status',
      });
    }
  })
);

/**
 * DELETE /api/newsletter/unsubscribe
 * Unsubscribe an email from the newsletter
 */
router.delete(
  '/unsubscribe',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    try {
      const unsubscribed = await NewsletterRepository.unsubscribe(email);

      if (unsubscribed) {
        res.status(200).json({
          success: true,
          message: 'Successfully unsubscribed from newsletter',
        } as NewsletterResponse);
      } else {
        res.status(404).json({
          success: false,
          error: 'Email not found in newsletter subscribers',
        });
      }
    } catch (error) {
      console.error('Error unsubscribing from newsletter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe from newsletter',
      });
    }
  })
);

/**
 * DELETE /api/newsletter/subscribers/:id
 * Delete a subscriber by ID
 */
router.delete(
  '/subscribers/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const subscriberId = parseInt(id, 10);

      if (isNaN(subscriberId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid subscriber ID',
        });
        return;
      }

      const deleted = await NewsletterRepository.deleteById(subscriberId);

      if (deleted) {
        res.status(200).json({
          success: true,
          message: 'Subscriber deleted successfully',
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Subscriber not found',
        });
      }
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete subscriber',
      });
    }
  })
);

/**
 * GET /api/newsletter/count
 * Get total count of newsletter subscribers
 */
router.get(
  '/count',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      const total = await NewsletterRepository.getTotal();

      res.status(200).json({
        success: true,
        total,
      });
    } catch (error) {
      console.error('Error getting subscriber count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscriber count',
      });
    }
  })
);

export default router;
