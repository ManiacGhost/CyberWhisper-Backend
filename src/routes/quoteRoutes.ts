import { Router, Request, Response } from 'express';
import { QuoteRepository } from '../repositories/quoteRepository';
import { sendQuotationEmail, sendAdminNotification } from '../utils/emailService';
import { asyncHandler } from '../middleware/errorHandler';
import { CreateQuoteRequest } from '../types/quote';

const router = Router();

/**
 * POST /api/quotes
 * Create a new quotation request
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, phone, message } = req.body as CreateQuoteRequest;

    // Validation
    if (!name || !email || !phone) {
      res.status(400).json({
        success: false,
        error: 'Name, email, and phone are required',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    try {
      // Create quote in database
      const quote = await QuoteRepository.createQuote({
        name,
        email,
        phone,
        message,
      });

      // Send email to user
      const emailSent = await sendQuotationEmail(name, email, phone, message);

      // Send notification to admin
      await sendAdminNotification(name, email, phone, message);

      res.status(201).json({
        success: true,
        message: 'Quotation request received successfully',
        data: quote,
        emailSent,
      });
    } catch (error) {
      console.error('Error creating quote:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process quotation request',
      });
    }
  })
);

/**
 * GET /api/quotes
 * Get all quotes (paginated)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    try {
      const { data, total } = await QuoteRepository.getAllQuotes(limit, offset);

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch quotes',
      });
    }
  })
);

/**
 * GET /api/quotes/:id
 * Get quote by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({
        success: false,
        error: 'Invalid quote ID',
      });
      return;
    }

    try {
      const quote = await QuoteRepository.getQuoteById(Number(id));

      if (!quote) {
        res.status(404).json({
          success: false,
          error: 'Quote not found',
        });
        return;
      }

      res.json({
        success: true,
        data: quote,
      });
    } catch (error) {
      console.error('Error fetching quote:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch quote',
      });
    }
  })
);

/**
 * GET /api/quotes/email/:email
 * Get quotes by email
 */
router.get(
  '/email/:email',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    try {
      const quotes = await QuoteRepository.getQuotesByEmail(email);

      res.json({
        success: true,
        data: quotes,
        count: quotes.length,
      });
    } catch (error) {
      console.error('Error fetching quotes by email:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch quotes',
      });
    }
  })
);

/**
 * DELETE /api/quotes/:id
 * Delete quote
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({
        success: false,
        error: 'Invalid quote ID',
      });
      return;
    }

    try {
      const deleted = await QuoteRepository.deleteQuote(Number(id));

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Quote not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Quote deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting quote:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete quote',
      });
    }
  })
);

export default router;
