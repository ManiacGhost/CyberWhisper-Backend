import { query } from '../config/database';
import { User, CreateUserRequest, UpdateUserRequest } from '../types/user';
import crypto from 'crypto';

export class UserRepository {
  /**
   * Hash password using SHA256
   */
  private static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Create a new user
   */
  static async createUser(data: CreateUserRequest & { profile_image_url?: string }): Promise<User> {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      title,
      address,
      biography,
      linkedin_url,
      github_url,
      role = 'STUDENT',
      is_instructor = false,
    } = data;

    const password_hash = this.hashPassword(password);

    const result = await query(
      `INSERT INTO users_cw (first_name, last_name, email, phone, password_hash, title, address, biography, linkedin_url, github_url, role, is_instructor, status, profile_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE', $13)
       RETURNING *`,
      [first_name, last_name, email, phone, password_hash, title || null, address || null, biography || null, linkedin_url || null, github_url || null, role, is_instructor, data.profile_image_url || null]
    );

    return result.rows[0] as User;
  }

  /**
   * Get all users with pagination
   */
  static async getAllUsers(
    limit: number = 10,
    offset: number = 0,
    filters?: { role?: string; status?: string; is_instructor?: boolean }
  ): Promise<{ users: User[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      const conditions = [];
      if (filters.role) {
        conditions.push(`role = $${paramIndex++}`);
        params.push(filters.role);
      }
      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }
      if (filters.is_instructor !== undefined) {
        conditions.push(`is_instructor = $${paramIndex++}`);
        params.push(filters.is_instructor);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM users_cw ${whereClause}`;
    const countResult = await query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    // Get users with pagination
    const usersQuery = `
      SELECT * FROM users_cw 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const allParams = [...params, limit, offset];
    const result = await query(usersQuery, allParams);

    return { users: result.rows as User[], total };
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: number): Promise<User | null> {
    const result = await query('SELECT * FROM users_cw WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const result = await query('SELECT * FROM users_cw WHERE email = $1', [email]);
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  }

  /**
   * Get user by phone
   */
  static async getUserByPhone(phone: string): Promise<User | null> {
    const result = await query('SELECT * FROM users_cw WHERE phone = $1', [phone]);
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  }

  /**
   * Update user
   */
  static async updateUser(id: number, data: UpdateUserRequest): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.getUserById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE users_cw 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  }

  /**
   * Delete user
   */
  static async deleteUser(id: number): Promise<boolean> {
    const result = await query('DELETE FROM users_cw WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get instructors only
   */
  static async getInstructors(limit: number = 10, offset: number = 0): Promise<{ users: User[]; total: number }> {
    const countResult = await query('SELECT COUNT(*) as count FROM users_cw WHERE role = $1 AND status = $2', [
      'INSTRUCTOR',
      'ACTIVE',
    ]);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      'SELECT * FROM users_cw WHERE role = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
      ['INSTRUCTOR', 'ACTIVE', limit, offset]
    );

    return { users: result.rows as User[], total };
  }

  /**
   * Search users by name or email
   */
  static async searchUsers(searchTerm: string, limit: number = 10, offset: number = 0): Promise<{ users: User[]; total: number }> {
    const searchPattern = `%${searchTerm}%`;

    const countResult = await query(
      `SELECT COUNT(*) as count FROM users_cw WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1) AND status = $2`,
      [searchPattern, 'ACTIVE']
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM users_cw WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [searchPattern, 'ACTIVE', limit, offset]
    );

    return { users: result.rows as User[], total };
  }
}
