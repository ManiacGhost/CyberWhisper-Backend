import cloudinary from '../config/cloudinary';
import { ImageUploadResponse } from '../types/blog';

/**
 * Upload image to Cloudinary
 * @param filePath - Local file path or URL to upload
 * @param folder - Cloudinary folder (e.g., 'blogs/thumbnails', 'blogs/banners')
 * @returns Upload result with URL and public ID
 */
export async function uploadImageToCloudinary(
  filePath: string,
  folder: string
): Promise<ImageUploadResponse> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `cyberwhisper/${folder}`,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Cloudinary upload error:', errorMessage);
    return {
      success: false,
      error: `Image upload failed: ${errorMessage}`,
    };
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 */
export async function deleteImageFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Cloudinary delete error:', errorMessage);
    return false;
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary secure URL
 * @returns Public ID
 */
export function extractPublicIdFromUrl(url: string): string {
  // URL format: https://res.cloudinary.com/{cloud}/image/upload/{public_id}
  const match = url.match(/\/cyberwhisper\/(.+)\./);
  return match ? `cyberwhisper/${match[1]}` : '';
}
