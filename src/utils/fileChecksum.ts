/**
 * Calculates SHA-256 Checksum of a File in the browser using the Web Crypto API
 */
export const calculateFileSha256 = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Could not calculate SHA-256 checksum for file:', file.name, err);
    return '';
  }
};

/**
 * Validates a file before upload
 */
export const validateFileBeforeUpload = (
  file: File,
  maxSizeMB = 50
): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'الملف غير محدد' };
  }

  if (file.size === 0) {
    return { valid: false, error: `الملف (${file.name}) فارغ بحجم 0 بايت.` };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `حجم الملف (${file.name}) يتجاوز الحد المسموح به (${maxSizeMB} ميجابايت).`
    };
  }

  return { valid: true };
};
