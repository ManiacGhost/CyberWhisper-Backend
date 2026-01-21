import { Router, Request, Response } from 'express';
import multer from 'multer';
import { GalleryRepository } from '../repositories/galleryRepository';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../utils/imageUpload';
import { CreateGalleryRequest, UpdateGalleryRequest } from '../types/gallery';
import { asyncHandler } from '../middleware/errorHandler';

interface MulterRequest extends Request {
  file?: any;
}

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: any, cb: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

// POST /api/gallery/upload
router.post(
  '/upload',
  upload.single('image'),
  asyncHandler(async (req: MulterRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file provided' });
      return;
    }

    const { title, context, alt_text, tags, sort_order, is_active } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: 'title is required' });
      return;
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const uploadResult = await uploadImageToCloudinary(dataURI, 'gallery');

    if (!uploadResult.success) {
      res.status(500).json(uploadResult);
      return;
    }

    let parsedTags = null;
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : tags;
    }

    const galleryData: CreateGalleryRequest = {
      title,
      context: context || undefined,
      alt_text: alt_text || undefined,
      tags: parsedTags || undefined,
      sort_order: sort_order ? parseInt(sort_order) : 0,
      is_active: is_active !== undefined ? is_active === 'true' || is_active === true : true,
    };

    try {
      const galleryImage = await GalleryRepository.createGalleryImage(
        uploadResult.url!,
        uploadResult.publicId!,
        galleryData
      );

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: galleryImage,
      });
    } catch (error) {
      if (uploadResult.publicId) {
        await deleteImageFromCloudinary(uploadResult.publicId);
      }
      throw error;
    }
  })
);

// GET /api/gallery
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const filters = {
      context: req.query.context as string | undefined,
      is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
      search: req.query.search as string | undefined,
    };

    const { images, total } = await GalleryRepository.getAllGalleryImages(limit, offset, filters);

    res.json({
      success: true,
      data: images,
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) },
    });
  })
);

// GET /api/gallery/context/:context
router.get(
  '/context/:context',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { context } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const { images, total } = await GalleryRepository.getGalleryByContext(context, limit, offset);

    res.json({
      success: true,
      data: images,
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) },
    });
  })
);

// GET /api/gallery/contexts
router.get(
  '/contexts',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const contexts = await GalleryRepository.getAllContexts();
    res.json({ success: true, data: contexts, total: contexts.length });
  })
);

// GET /api/gallery/:id
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const galleryImage = await GalleryRepository.getGalleryImageById(parseInt(id));

    if (!galleryImage) {
      res.status(404).json({ success: false, error: 'Gallery image not found' });
      return;
    }

    res.json({ success: true, data: galleryImage });
  })
);

// POST /api/gallery/:id
router.post(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData: UpdateGalleryRequest = req.body;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update provided' });
      return;
    }

    if (updateData.is_active !== undefined && typeof updateData.is_active === 'string') {
      updateData.is_active = updateData.is_active === 'true';
    }

    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = (updateData.tags as string).split(',').map((t: string) => t.trim()) as any;
    }

    const galleryImage = await GalleryRepository.updateGalleryImage(parseInt(id), updateData);

    if (!galleryImage) {
      res.status(404).json({ success: false, error: 'Gallery image not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Gallery image updated successfully',
      data: galleryImage,
    });
  })
);

// POST /api/gallery/:id/image
router.post(
  '/:id/image',
  upload.single('image'),
  asyncHandler(async (req: MulterRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file provided' });
      return;
    }

    const { id } = req.params;
    const galleryImage = await GalleryRepository.getGalleryImageById(parseInt(id));

    if (!galleryImage) {
      res.status(404).json({ success: false, error: 'Gallery image not found' });
      return;
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const uploadResult = await uploadImageToCloudinary(dataURI, 'gallery');

    if (!uploadResult.success) {
      res.status(500).json(uploadResult);
      return;
    }

    const { query } = await import('../config/database');
    const updateResult = await query(
      `UPDATE gallery_cw SET image_url = $1, public_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [uploadResult.url, uploadResult.publicId, parseInt(id)]
    );

    const updatedImage = updateResult.rows[0];

    if (galleryImage.public_id) {
      await deleteImageFromCloudinary(galleryImage.public_id);
    }

    res.json({
      success: true,
      message: 'Gallery image file updated successfully',
      data: updatedImage,
    });
  })
);

// DELETE /api/gallery/:id/remove
router.delete(
  '/:id/remove',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const deleteFromCloudinary = req.query.deleteFromCloudinary !== 'false';

    const galleryImage = await GalleryRepository.getGalleryImageById(parseInt(id));

    if (!galleryImage) {
      res.status(404).json({ success: false, error: 'Gallery image not found' });
      return;
    }

    if (deleteFromCloudinary && galleryImage.public_id) {
      await deleteImageFromCloudinary(galleryImage.public_id);
    }

    const deleted = await GalleryRepository.deleteGalleryImage(parseInt(id));

    if (!deleted) {
      res.status(500).json({ success: false, error: 'Failed to delete gallery image' });
      return;
    }

    res.json({ success: true, message: 'Gallery image deleted successfully' });
  })
);

// POST /api/gallery/reorder
router.post(
  '/reorder',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { imageOrders } = req.body;

    if (!Array.isArray(imageOrders) || imageOrders.length === 0) {
      res.status(400).json({ success: false, error: 'imageOrders array is required' });
      return;
    }

    const reordered = await GalleryRepository.reorderGalleryImages(imageOrders);

    if (!reordered) {
      res.status(500).json({ success: false, error: 'Failed to reorder gallery images' });
      return;
    }

    res.json({ success: true, message: 'Gallery images reordered successfully' });
  })
);

export default router;
