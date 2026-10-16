/**
 * BillBridge In-Browser Image Compressor
 *
 * Safely compresses large phone camera photos and scans of medical bills
 * in the client browser before OCR extraction, preserving text legibility
 * and critical high-frequency character edges (CPT/HCPCS codes, dollar amounts).
 */

export interface CompressionOptions {
  /**
   * Maximum dimension (width or height) in pixels.
   * Default: 2400px (provides ~280-300 DPI equivalent for standard 8.5x11" billing statements).
   */
  maxDimension?: number;
  /**
   * Compression quality (0.0 to 1.0) for JPEG output.
   * Default: 0.88 (preserves high-contrast character edges without macroblocking).
   */
  quality?: number;
  /**
   * Minimum file size in bytes before compression is attempted.
   * Files smaller than this threshold are returned untouched.
   * Default: 1.5 MB (1,572,864 bytes).
   */
  thresholdBytes?: number;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savingsRatio: number;
  wasCompressed: boolean;
  width?: number;
  height?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxDimension: 2400,
  quality: 0.88,
  thresholdBytes: 1.5 * 1024 * 1024, // 1.5 MB
};

/**
 * Checks whether a given file is a compressable raster image (JPEG or PNG).
 */
export function isCompressableImage(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png")
  );
}

/**
 * Compresses an image file in-browser if it exceeds the size threshold,
 * maintaining high DPI clarity for OCR processing.
 *
 * In headless / test environments where HTMLCanvasElement or Image is absent,
 * it returns the original file safely without throwing.
 */
export async function compressImageIfSafe(
  file: File,
  options: CompressionOptions = {},
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // 1. Skip non-images or files under size threshold
  if (!isCompressableImage(file) || originalSize < opts.thresholdBytes) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsRatio: 0,
      wasCompressed: false,
    };
  }

  // 2. Check environment support for Canvas & DOM Image
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    typeof FileReader === "undefined"
  ) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsRatio: 0,
      wasCompressed: false,
    };
  }

  try {
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);

    let { width, height } = img;

    // Calculate dimensions while maintaining aspect ratio
    if (width > opts.maxDimension || height > opts.maxDimension) {
      if (width > height) {
        height = Math.round((height * opts.maxDimension) / width);
        width = opts.maxDimension;
      } else {
        width = Math.round((width * opts.maxDimension) / height);
        height = opts.maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        savingsRatio: 0,
        wasCompressed: false,
      };
    }

    // High quality bicubic smoothing for text legibility
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Fill white background to handle PNG transparencies cleanly
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(img, 0, 0, width, height);

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", opts.quality);
    });

    if (!compressedBlob || compressedBlob.size >= originalSize) {
      // If compression somehow produced a larger file, keep the original
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        savingsRatio: 0,
        wasCompressed: false,
        width,
        height,
      };
    }

    const compressedFileName =
      file.name.replace(/\.[^/.]+$/, "") + "_optimized.jpg";
    const compressedFile = new File([compressedBlob], compressedFileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    const savingsRatio = (originalSize - compressedFile.size) / originalSize;

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      savingsRatio,
      wasCompressed: true,
      width,
      height,
    };
  } catch {
    // If any step in canvas processing fails, gracefully return original file
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsRatio: 0,
      wasCompressed: false,
    };
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
