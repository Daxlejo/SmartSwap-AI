export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_MAX_DIMENSION = 1024;
const DEFAULT_QUALITY = 0.82;

export const calculateTargetDimensions = (
  width: number,
  height: number,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
): { width: number; height: number } => {
  if (width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension };
  }

  if (width <= maxDimension && height <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  if (width >= height) {
    const ratio = maxDimension / width;
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(height * ratio)),
    };
  }

  const ratio = maxDimension / height;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: maxDimension,
  };
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer el archivo de imagen.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });
};

export const compressImageToDataUrl = async (
  file: File,
  options: ImageCompressionOptions = {},
): Promise<string> => {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const mimeType = options.mimeType ?? 'image/jpeg';

  // Keep SVGs intact as data URLs without rasterizing
  if (file.type === 'image/svg+xml') {
    return readFileAsDataUrl(file);
  }

  const rawDataUrl = await readFileAsDataUrl(file);

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        const { width, height } = calculateTargetDimensions(
          img.naturalWidth || img.width || maxDimension,
          img.naturalHeight || img.height || maxDimension,
          maxDimension,
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        if (compressedDataUrl && compressedDataUrl.startsWith('data:image/')) {
          resolve(compressedDataUrl);
        } else {
          resolve(rawDataUrl);
        }
      } catch {
        resolve(rawDataUrl);
      }
    };

    img.onerror = () => {
      resolve(rawDataUrl);
    };

    img.src = rawDataUrl;
  });
};

export const compressImage = compressImageToDataUrl;

export default compressImageToDataUrl;
