import { query } from '../config/database';
import { UserSkill, CreateSkillRequest } from '../types/user';

export class SkillRepository {
  /**
   * Add a skill to a user
   */
  static async addSkill(data: CreateSkillRequest): Promise<UserSkill> {
    const { user_id, skill } = data;

    const result = await query(
      `INSERT INTO user_skills (user_id, skill)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, skill]
    );

    return result.rows[0] as UserSkill;
  }

  /**
   * Get all skills for a user
   */
  static async getUserSkills(user_id: number): Promise<UserSkill[]> {
    const result = await query('SELECT * FROM user_skills WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
    return result.rows as UserSkill[];
  }

  /**
   * Get skill by ID
   */
  static async getSkillById(id: number): Promise<UserSkill | null> {
    const result = await query('SELECT * FROM user_skills WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as UserSkill) : null;
  }

  /**
   * Check if user has a skill
   */
  static async userHasSkill(user_id: number, skill: string): Promise<boolean> {
    const result = await query('SELECT * FROM user_skills WHERE user_id = $1 AND LOWER(skill) = LOWER($2)', [user_id, skill]);
    return result.rows.length > 0;
  }

  /**
   * Update a skill
   */
  static async updateSkill(id: number, skill: string): Promise<UserSkill | null> {
    const result = await query('UPDATE user_skills SET skill = $1 WHERE id = $2 RETURNING *', [skill, id]);
    return result.rows.length > 0 ? (result.rows[0] as UserSkill) : null;
  }

  /**
   * Delete a skill
   */
  static async deleteSkill(id: number): Promise<boolean> {
    const result = await query('DELETE FROM user_skills WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Delete all skills for a user (used when deleting user)
   */
  static async deleteUserSkills(user_id: number): Promise<boolean> {
    const result = await query('DELETE FROM user_skills WHERE user_id = $1', [user_id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get users with a specific skill
   */
  static async getUsersWithSkill(skill: string): Promise<UserSkill[]> {
    const result = await query('SELECT * FROM user_skills WHERE LOWER(skill) LIKE LOWER($1) ORDER BY created_at DESC', [`%${skill}%`]);
    return result.rows as UserSkill[];
  }

  /**
   * Count skills per user
   */
  static async getSkillCountByUser(user_id: number): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM user_skills WHERE user_id = $1', [user_id]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get all unique skills in the system
   */
  static async getAllUniqueSkills(): Promise<string[]> {
    const result = await query('SELECT DISTINCT skill FROM user_skills ORDER BY skill ASC');
    return result.rows.map((row) => row.skill);
  }
}
