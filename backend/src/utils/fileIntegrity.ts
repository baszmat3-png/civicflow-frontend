import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AppError } from '../middlewares/error.middleware.js';

export interface FileIntegrityResult {
  valid: boolean;
  actualSize: number;
  actualChecksum: string;
  error?: string;
}

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Calculates SHA-256 checksum of a file path in binary mode
 */
export const calculateFileSha256 = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

/**
 * Safely removes a corrupted or incomplete uploaded file from disk
 */
export const cleanupFile = (filePath?: string) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`⚠️ Failed to delete corrupted file at ${filePath}:`, err);
  }
};

/**
 * Validates uploaded file size, non-emptiness, and verifies checksum against client's hash
 */
export const verifyAndValidateUploadedFile = (
  file: Express.Multer.File,
  options?: {
    expectedSize?: number;
    expectedChecksum?: string;
  }
): FileIntegrityResult => {
  const filePath = file.path;

  if (!filePath || !fs.existsSync(filePath)) {
    return {
      valid: false,
      actualSize: 0,
      actualChecksum: '',
      error: `فشل حفظ الملف (${file.originalname}): لم يتم العثور على الملف على الخادم بعد الرفع.`
    };
  }

  const stat = fs.statSync(filePath);
  const actualSize = stat.size;

  // 1. Check for empty/truncated files (0 bytes)
  if (actualSize === 0) {
    cleanupFile(filePath);
    return {
      valid: false,
      actualSize: 0,
      actualChecksum: '',
      error: `الملف المرفوع (${file.originalname}) فارغ بحجم 0 بايت.`
    };
  }

  // 2. Validate against client expected size (if provided)
  const expectedSize = options?.expectedSize !== undefined && options.expectedSize > 0
    ? options.expectedSize
    : (file.size > 0 ? file.size : undefined);

  if (expectedSize !== undefined && actualSize !== expectedSize) {
    cleanupFile(filePath);
    return {
      valid: false,
      actualSize,
      actualChecksum: '',
      error: `فشل التحقق من اكتمال الملف (${file.originalname}): الحجم الفعلي (${formatBytes(actualSize)}) لا يتطابق مع الحجم المرسل (${formatBytes(expectedSize)}).`
    };
  }

  // 3. Compute SHA-256 Checksum in binary mode
  let actualChecksum = '';
  try {
    actualChecksum = calculateFileSha256(filePath);
  } catch (readErr) {
    cleanupFile(filePath);
    return {
      valid: false,
      actualSize,
      actualChecksum: '',
      error: `تعذر قراءة الملف المرفوع (${file.originalname}) للتحقق من سلامته.`
    };
  }

  // 4. Validate Checksum (MD5 / SHA-256) if client provided it
  const expectedChecksum = options?.expectedChecksum?.trim().toLowerCase();
  if (expectedChecksum) {
    // If client sent SHA-256
    if (expectedChecksum.length === 64) {
      if (actualChecksum.toLowerCase() !== expectedChecksum) {
        cleanupFile(filePath);
        return {
          valid: false,
          actualSize,
          actualChecksum,
          error: `فشل التحقق من البصمة الرقمية للملف (${file.originalname}) [SHA-256 Checksum Mismatch]. الملف تالف أو تعرض لخلل أثناء النقل.`
        };
      }
    } else if (expectedChecksum.length === 32) {
      // If client sent MD5
      const actualMd5 = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
      if (actualMd5.toLowerCase() !== expectedChecksum) {
        cleanupFile(filePath);
        return {
          valid: false,
          actualSize,
          actualChecksum,
          error: `فشل التحقق من البصمة الرقمية للملف (${file.originalname}) [MD5 Checksum Mismatch]. الملف تالف أو تعرض لخلل أثناء النقل.`
        };
      }
    }
  }

  return {
    valid: true,
    actualSize,
    actualChecksum
  };
};
