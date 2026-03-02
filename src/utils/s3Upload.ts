import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../config/s3';
import crypto from 'crypto';

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  presignedUrl?: string;
  fileName?: string;
  error?: string;
  key?: string;
  expiresIn?: number;
}

/**
 * Generate a unique file name
 */
function generateUniqueFileName(originalFileName: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = originalFileName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Upload a file to S3 and generate a presigned URL
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  originalFileName: string,
  folder: string = 'brochures',
  expirationSeconds: number = 86400 // 24 hours default
): Promise<UploadResult> {
  try {
    if (!process.env.AWS_BUCKET_NAME) {
      return {
        success: false,
        error: 'AWS_BUCKET_NAME not configured',
      };
    }

    const uniqueFileName = generateUniqueFileName(originalFileName);
    const key = `${folder}/${uniqueFileName}`;

    // Upload the file to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: getContentType(originalFileName),
    });

    await s3Client.send(uploadCommand);

    // Generate presigned URL for downloading the file
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: expirationSeconds,
    });

    // Also generate the regular URL for reference
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${key}`;

    return {
      success: true,
      presignedUrl,
      fileUrl, // Regular URL (won't work if bucket is private)
      fileName: uniqueFileName,
      key,
      expiresIn: expirationSeconds,
    };
  } catch (error: any) {
    console.error('❌ S3 Upload Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to upload file to S3',
    };
  }
}

/**
 * Generate a presigned URL for an existing file in S3
 */
export async function generatePresignedUrl(
  key: string,
  expirationSeconds: number = 86400 // 24 hours default
): Promise<UploadResult> {
  try {
    if (!process.env.AWS_BUCKET_NAME) {
      return {
        success: false,
        error: 'AWS_BUCKET_NAME not configured',
      };
    }

    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: expirationSeconds,
    });

    return {
      success: true,
      presignedUrl,
      key,
      expiresIn: expirationSeconds,
    };
  } catch (error: any) {
    console.error('❌ Presigned URL Generation Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to generate presigned URL',
    };
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<UploadResult> {
  try {
    if (!process.env.AWS_BUCKET_NAME) {
      return {
        success: false,
        error: 'AWS_BUCKET_NAME not configured',
      };
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('❌ S3 Delete Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to delete file from S3',
    };
  }
}

/**
 * Convert S3 URL to presigned URL
 * Extracts the key from a regular S3 URL and generates a presigned URL
 */
export async function convertS3UrlToPresigned(
  s3Url: string | null,
  expirationSeconds: number = 86400 // 24 hours default
): Promise<string | null> {
  if (!s3Url) {
    return null;
  }

  try {
    // Extract the key from the S3 URL
    // Format: https://bucket-name.s3.region.amazonaws.com/key/to/file
    const urlParts = s3Url.split('.s3.');
    if (urlParts.length < 2) {
      // URL is not in expected S3 format, return as-is
      return s3Url;
    }

    // Extract key from the second part
    const secondPart = urlParts[1];
    const keyStartIndex = secondPart.indexOf('/');
    if (keyStartIndex === -1) {
      return s3Url;
    }

    const key = secondPart.substring(keyStartIndex + 1);

    if (!process.env.AWS_BUCKET_NAME) {
      console.warn('AWS_BUCKET_NAME not configured');
      return s3Url;
    }

    // Generate presigned URL for the extracted key
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: expirationSeconds,
    });

    return presignedUrl;
  } catch (error: any) {
    console.error('❌ Error converting S3 URL to presigned:', error.message);
    // Return original URL if conversion fails
    return s3Url;
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: { [key: string]: string } = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}
