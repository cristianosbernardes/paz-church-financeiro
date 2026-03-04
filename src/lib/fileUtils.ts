/**
 * Converts an image File to WebP format at given quality using Canvas.
 * Returns a new File with .webp extension.
 */
export async function convertImageToWebP(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('WebP conversion failed'));
          const baseName = file.name.replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
        },
        'image/webp',
        quality,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if a file is an image type that can be converted to WebP.
 */
export function isConvertibleImage(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/tiff'].includes(file.type);
}

/**
 * Process a file before upload:
 * - Images → convert to WebP at 85% quality
 * - PDFs → keep as-is (browser can't compress PDFs client-side)
 */
export async function processFileForUpload(file: File): Promise<File> {
  if (isConvertibleImage(file)) {
    return convertImageToWebP(file, 0.85);
  }
  // PDFs and other files are kept as-is
  return file;
}

/**
 * Get the correct storage bucket based on transaction type.
 */
export function getBucketForType(type: 'INCOME' | 'EXPENSE'): string {
  return type === 'INCOME' ? 'arquivos-de-entrada' : 'arquivos-de-saida';
}

/**
 * Build a storage path: churchId/YYYY-MM/filename
 */
export function buildStoragePath(churchId: string, date: string, fileName: string): string {
  const yearMonth = date.substring(0, 7); // YYYY-MM
  return `${churchId}/${yearMonth}/${Date.now()}_${fileName}`;
}

/**
 * Downloads a WebP image and converts it to PNG for universal compatibility.
 * For non-WebP files, triggers a normal download.
 */
export async function downloadFileAsPng(url: string, fileName: string): Promise<void> {
  const isWebP = url.includes('.webp') || fileName.endsWith('.webp');

  if (!isWebP) {
    // Direct download for non-webp files (PDFs, etc)
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Convert WebP → PNG
  const response = await fetch(url);
  const blob = await response.blob();
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (pngBlob) => {
          if (!pngBlob) return reject(new Error('PNG conversion failed'));
          const pngName = fileName.replace(/\.webp$/i, '.png');
          const link = document.createElement('a');
          link.href = URL.createObjectURL(pngBlob);
          link.download = pngName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          resolve();
        },
        'image/png',
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for conversion'));
    img.crossOrigin = 'anonymous';
    img.src = URL.createObjectURL(blob);
  });
}
