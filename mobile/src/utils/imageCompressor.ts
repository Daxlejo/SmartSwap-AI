export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
  /** Centre-crop to a maxDimension x maxDimension square (profile photos). */
  square?: boolean;
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

/** Largest centred square inside a width x height image. */
export const calculateSquareCrop = (
  width: number,
  height: number,
): { sx: number; sy: number; side: number } => {
  const side = Math.max(1, Math.min(width, height));
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
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
        const sourceWidth = img.naturalWidth || img.width || maxDimension;
        const sourceHeight = img.naturalHeight || img.height || maxDimension;
        const crop = options.square
          ? calculateSquareCrop(sourceWidth, sourceHeight)
          : { sx: 0, sy: 0, side: 0 };
        const { width, height } = options.square
          ? { width: Math.min(maxDimension, crop.side), height: Math.min(maxDimension, crop.side) }
          : calculateTargetDimensions(sourceWidth, sourceHeight, maxDimension);

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
        if (options.square) {
          ctx.drawImage(img, crop.sx, crop.sy, crop.side, crop.side, 0, 0, width, height);
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

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
