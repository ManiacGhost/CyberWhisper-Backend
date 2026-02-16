import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../config/s3';
import crypto from 'crypto';

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
  key?: string;
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
 * Upload a file to S3
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  originalFileName: string,
  folder: string = 'brochures'
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

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: getContentType(originalFileName),
    });

    await s3Client.send(command);

    // Generate the file URL
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${key}`;

    return {
      success: true,
      fileUrl,
      fileName: uniqueFileName,
      key,
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
