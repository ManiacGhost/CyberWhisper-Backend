import { Router, Request, Response } from 'express';
import { NewsletterRepository } from '../repositories/newsletterRepository';
import { asyncHandler } from '../middleware/errorHandler';
import { SubscribeRequest, ListSubscribersResponse, NewsletterResponse, SendNewsletterRequest, SendNewsletterResponse } from '../types/newsletter';
import { authMiddleware, AuthRequest, instructorOnlyMiddleware } from '../middleware/adminAuthMiddleware';
import { sendNewsletterToBulk } from '../utils/emailService';

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
    const { email } = req.params as { email: string };

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
    const { id } = req.params as { id: string };

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

/**
 * POST /api/newsletter/send
 * Send newsletter to all subscribers
 * Requires authentication (admin/instructor only)
 * Body: { subject, content (HTML), plainText? }
 */
router.post(
  '/send',
  authMiddleware,
  instructorOnlyMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { subject, content, plainText } = req.body as SendNewsletterRequest;

    // Validation
    if (!subject || !content) {
      res.status(400).json({
        success: false,
        error: 'Subject and content are required',
      });
      return;
    }

    if (subject.trim().length < 3) {
      res.status(400).json({
        success: false,
        error: 'Subject must be at least 3 characters',
      });
      return;
    }

    if (content.trim().length < 10) {
      res.status(400).json({
        success: false,
        error: 'Content must be at least 10 characters',
      });
      return;
    }

    try {
      // Get all subscribers
      const subscribers = await NewsletterRepository.getAllSubscribersForBulkSend();

      if (subscribers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No subscribers found',
        });
        return;
      }

      // Extract email addresses
      const emails = subscribers.map(sub => sub.email);

      // Create newsletter wrapper HTML
      const wrappedHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              margin-top: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #007bff;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2c3e50;
              margin: 0;
              font-size: 24px;
            }
            .content {
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #7f8c8d;
              font-size: 12px;
            }
            .unsubscribe {
              margin-top: 10px;
            }
            .unsubscribe a {
              color: #007bff;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 CyberWhisper Newsletter</h1>
            </div>

            <div class="content">
              ${content}
            </div>

            <div class="footer">
              <p>© 2026 CyberWhisper. All rights reserved.</p>
              <div class="unsubscribe">
                <p>You received this email because you're subscribed to CyberWhisper newsletter.</p>
                <p><a href="http://localhost:3000/api/newsletter/unsubscribe">Unsubscribe</a> from future newsletters</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send newsletter to all subscribers
      const result = await sendNewsletterToBulk(emails, subject, wrappedHtml, plainText);

      const response: SendNewsletterResponse = {
        success: true,
        message: `Newsletter sent successfully`,
        data: {
          totalSubscribers: subscribers.length,
          sentCount: result.successCount,
          failedCount: result.failedCount,
          failedEmails: result.failedEmails.length > 0 ? result.failedEmails : undefined,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error sending newsletter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send newsletter',
      });
    }
  })
);

export default router;
