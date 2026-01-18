import { query } from '../config/database';
import { NewsletterSubscriber, SubscribeRequest } from '../types/newsletter';

export class NewsletterRepository {
  /**
   * Subscribe email to newsletter
   */
  static async subscribe(data: SubscribeRequest): Promise<NewsletterSubscriber> {
    const { email } = data;

    const result = await query(
      `INSERT INTO newsletter_subscribers (email, created_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO UPDATE SET created_at = CURRENT_TIMESTAMP
       RETURNING id, email, created_at`,
      [email]
    );

    return result.rows[0] as NewsletterSubscriber;
  }

  /**
   * Get all newsletter subscribers
   */
  static async getAllSubscribers(
    limit: number = 10,
    offset: number = 0
  ): Promise<{ data: NewsletterSubscriber[]; total: number }> {
    const countResult = await query('SELECT COUNT(*) as total FROM newsletter_subscribers');
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await query(
      `SELECT id, email, created_at
       FROM newsletter_subscribers
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      data: result.rows as NewsletterSubscriber[],
      total,
    };
  }

  /**
   * Check if email is already subscribed
   */
  static async isSubscribed(email: string): Promise<boolean> {
    const result = await query(
      `SELECT id FROM newsletter_subscribers WHERE email = $1`,
      [email]
    );

    return result.rows.length > 0;
  }

  /**
   * Get subscriber by email
   */
  static async getByEmail(email: string): Promise<NewsletterSubscriber | null> {
    const result = await query(
      `SELECT id, email, created_at FROM newsletter_subscribers WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Unsubscribe from newsletter
   */
  static async unsubscribe(email: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM newsletter_subscribers WHERE email = $1`,
      [email]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete subscriber by ID
   */
  static async deleteById(id: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM newsletter_subscribers WHERE id = $1`,
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get subscriber count
   */
  static async getTotal(): Promise<number> {
    const result = await query('SELECT COUNT(*) as total FROM newsletter_subscribers');
    return parseInt(result.rows[0].total, 10);
  }
}
