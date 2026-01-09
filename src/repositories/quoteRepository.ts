import { query } from '../config/database';
import { Quote, CreateQuoteRequest, QuoteResponse } from '../types/quote';

export class QuoteRepository {
  /**
   * Create a new quote request
   */
  static async createQuote(data: CreateQuoteRequest): Promise<QuoteResponse> {
    const { name, email, phone, message } = data;

    const result = await query(
      `INSERT INTO get_quotes (name, email, phone, message, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, name, email, phone, message, created_at`,
      [name, email, phone, message || null]
    );

    return result.rows[0] as QuoteResponse;
  }

  /**
   * Get all quotes
   */
  static async getAllQuotes(limit: number = 10, offset: number = 0): Promise<{ data: Quote[]; total: number }> {
    const countResult = await query('SELECT COUNT(*) as total FROM get_quotes');
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await query(
      `SELECT id, name, email, phone, message, created_at
       FROM get_quotes
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      data: result.rows as Quote[],
      total,
    };
  }

  /**
   * Get quote by ID
   */
  static async getQuoteById(id: number): Promise<Quote | null> {
    const result = await query(
      `SELECT id, name, email, phone, message, created_at
       FROM get_quotes WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get quotes by email
   */
  static async getQuotesByEmail(email: string): Promise<Quote[]> {
    const result = await query(
      `SELECT id, name, email, phone, message, created_at
       FROM get_quotes WHERE LOWER(email) = LOWER($1)
       ORDER BY created_at DESC`,
      [email]
    );

    return result.rows as Quote[];
  }

  /**
   * Delete quote
   */
  static async deleteQuote(id: number): Promise<boolean> {
    const result = await query('DELETE FROM get_quotes WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}
