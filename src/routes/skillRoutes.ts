import { Router, Request, Response } from 'express';
import { SkillRepository } from '../repositories/skillRepository';
import { UserRepository } from '../repositories/userRepository';
import { SkillResponse, CreateSkillRequest } from '../types/user';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/skills
 * Add a skill to a user
 * Body: { user_id, skill }
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { user_id, skill } = req.body;

    // Validate required fields
    if (!user_id || !skill || !skill.trim()) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, skill',
      });
      return;
    }

    // Check if user exists
    const user = await UserRepository.getUserById(user_id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if user already has this skill
    const hasSkill = await SkillRepository.userHasSkill(user_id, skill);
    if (hasSkill) {
      res.status(400).json({
        success: false,
        error: 'User already has this skill',
      });
      return;
    }

    const skillData: CreateSkillRequest = {
      user_id,
      skill: skill.trim(),
    };

    const newSkill = await SkillRepository.addSkill(skillData);

    const response: SkillResponse = {
      success: true,
      data: newSkill,
    };

    res.status(201).json(response);
  })
);

/**
 * GET /api/skills/user/:userId
 * Get all skills for a user
 */
router.get(
  '/user/:userId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    // Check if user exists
    const user = await UserRepository.getUserById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const skills = await SkillRepository.getUserSkills(userId);

    const response: SkillResponse = {
      success: true,
      data: skills,
    };

    res.json(response);
  })
);

/**
 * GET /api/skills/:id
 * Get skill by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid skill ID',
      });
      return;
    }

    const skill = await SkillRepository.getSkillById(id);

    if (!skill) {
      res.status(404).json({
        success: false,
        error: 'Skill not found',
      });
      return;
    }

    const response: SkillResponse = {
      success: true,
      data: skill,
    };

    res.json(response);
  })
);

/**
 * POST /api/skills/:id/update
 * Update a skill
 * Body: { skill }
 */
router.post(
  '/:id/update',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const { skill } = req.body;

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid skill ID',
      });
      return;
    }

    if (!skill || !skill.trim()) {
      res.status(400).json({
        success: false,
        error: 'Skill is required',
      });
      return;
    }

    const existingSkill = await SkillRepository.getSkillById(id);

    if (!existingSkill) {
      res.status(404).json({
        success: false,
        error: 'Skill not found',
      });
      return;
    }

    const updatedSkill = await SkillRepository.updateSkill(id, skill.trim());

    if (!updatedSkill) {
      res.status(500).json({
        success: false,
        error: 'Failed to update skill',
      });
      return;
    }

    const response: SkillResponse = {
      success: true,
      data: updatedSkill,
    };

    res.json(response);
  })
);

/**
 * DELETE /api/skills/:id
 * Delete a skill
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid skill ID',
      });
      return;
    }

    const skill = await SkillRepository.getSkillById(id);

    if (!skill) {
      res.status(404).json({
        success: false,
        error: 'Skill not found',
      });
      return;
    }

    const deleted = await SkillRepository.deleteSkill(id);

    if (!deleted) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete skill',
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Skill deleted successfully' },
    });
  })
);

/**
 * GET /api/skills/search/:skill
 * Get users with a specific skill
 */
router.get(
  '/search/:skill',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { skill } = req.params;

    if (!skill || skill.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: 'Skill search term must be at least 2 characters',
      });
      return;
    }

    const skills = await SkillRepository.getUsersWithSkill(skill);

    const response: SkillResponse = {
      success: true,
      data: skills,
    };

    res.json(response);
  })
);

/**
 * GET /api/skills/all-unique
 * Get all unique skills in the system
 */
router.get(
  '/all-unique',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const skills = await SkillRepository.getAllUniqueSkills();

    res.json({
      success: true,
      data: skills,
    });
  })
);

export default router;
