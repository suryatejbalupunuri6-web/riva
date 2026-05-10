export interface ProcessOptions {
  targetSize?: number;
  quality?: number;
  format?: "webp" | "jpeg";
}

export interface ProcessedImage {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  format: string;
  sizeKB: number;
  /** Present when HEIC could not be decoded natively — warn the user */
  heicWarning?: string;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 50 MB — we compress instead of reject
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
// If any dimension exceeds this, downscale first to protect canvas memory
const DOWNSCALE_THRESHOLD = 2048;
// Max output blob — re-compress if exceeded
const MAX_OUTPUT_BYTES = 300 * 1024;
// Hard limit before upload — if still over, do extra compression pass
const PRE_UPLOAD_MAX_BYTES = 500 * 1024;

export function validateFile(file: File): { valid: boolean; error?: string } {
  const acceptedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
  ];
  const acceptedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".tiff",
    ".tif",
    ".heic",
    ".heif",
  ];

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "File is too large (max 50 MB). Please choose a smaller image.",
    };
  }

  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const typeOk = acceptedTypes.includes(file.type.toLowerCase());
  const extOk = acceptedExtensions.includes(ext);

  if (!typeOk && !extOk) {
    return {
      valid: false,
      error: "Please select an image file (JPG, PNG, WEBP, HEIC, etc.)",
    };
  }

  return { valid: true };
}

function isHeic(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    ext === "heic" ||
    ext === "heif"
  );
}

/**
 * Try to load a HEIC file natively.
 * Returns { file, warning } — file is the original if native decode works,
 * or the original with a warning if the browser can't decode it.
 * Never throws — callers fall back to center-crop on warning.
 */
export async function loadHeic(
  file: File,
): Promise<{ file: File; warning?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ file });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        file,
        warning:
          "HEIC format may not be fully supported on this device. The image was processed with center crop.",
      });
    };
    img.src = url;
  });
}

/**
 * Read EXIF orientation tag from a JPEG file using DataView.
 * Returns an orientation value 1-8, or 1 (normal) if not found.
 */
function readExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  // JPEG SOI marker
  if (view.getUint16(0) !== 0xffd8) return 1;

  let offset = 2;
  const length = view.byteLength;

  while (offset < length - 2) {
    const marker = view.getUint16(offset);
    offset += 2;

    // APP1 marker (0xFFE1) contains EXIF data
    if (marker === 0xffe1) {
      const segLength = view.getUint16(offset);
      // Check for "Exif" header
      if (view.getUint32(offset + 2) === 0x45786966) {
        const tiffOffset = offset + 8; // skip segment length (2) + "Exif\0\0" (6)
        const littleEndian = view.getUint16(tiffOffset) === 0x4949;
        const getUint16 = (o: number) =>
          view.getUint16(tiffOffset + o, littleEndian);
        const getUint32 = (o: number) =>
          view.getUint32(tiffOffset + o, littleEndian);

        const ifdOffset = getUint32(4);
        const entryCount = getUint16(ifdOffset);

        for (let i = 0; i < entryCount; i++) {
          const entryOffset = ifdOffset + 2 + i * 12;
          const tag = getUint16(entryOffset);
          if (tag === 0x0112) {
            // Orientation tag
            return getUint16(entryOffset + 8);
          }
        }
      }
      offset += segLength;
    } else if ((marker & 0xff00) !== 0xff00) {
      break;
    } else {
      offset += view.getUint16(offset);
    }
  }

  return 1;
}

/**
 * Apply EXIF orientation correction to a canvas using transform.
 * Returns the corrected output dimensions (swapped for 90/270 rotations).
 */
function applyExifOrientationTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number,
): { correctedW: number; correctedH: number } {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      return { correctedW: width, correctedH: height };
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      return { correctedW: width, correctedH: height };
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      return { correctedW: width, correctedH: height };
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      return { correctedW: height, correctedH: width };
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      return { correctedW: height, correctedH: width };
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      return { correctedW: height, correctedH: width };
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      return { correctedW: height, correctedH: width };
    default:
      return { correctedW: width, correctedH: height };
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Use createImageBitmap if available (faster, no layout thrash, works in WebView).
 * Falls back to HTMLImageElement.
 */
async function loadImageBitmap(
  blob: Blob,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap !== "undefined") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // fall through to Image element
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await loadImageElement(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getImageDimensions(img: ImageBitmap | HTMLImageElement): {
  w: number;
  h: number;
} {
  if (img instanceof ImageBitmap) {
    return { w: img.width, h: img.height };
  }
  return { w: img.naturalWidth, h: img.naturalHeight };
}

/**
 * Draw an ImageBitmap or HTMLImageElement onto a canvas.
 * sx, sy, sw, sh = source rect  |  dx, dy, dw, dh = dest rect
 */
function drawTile(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap | HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  ctx.drawImage(img as CanvasImageSource, sx, sy, sw, sh, dx, dy, dw, dh);
}

async function blobToWebP(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (b) => {
        if (b && b.size > 0) {
          resolve(b);
        } else {
          // Fallback to JPEG if WebP is not supported
          canvas.toBlob((jb) => resolve(jb!), "image/jpeg", quality);
        }
      },
      "image/webp",
      quality,
    );
  });
}

/**
 * Re-compress until the blob is under MAX_OUTPUT_BYTES.
 * Tries WEBP at progressively lower qualities, then falls back to JPEG.
 */
async function compressToLimit(
  canvas: HTMLCanvasElement,
  initialQuality: number,
): Promise<Blob> {
  const qualities = [initialQuality, 0.75, 0.6, 0.5, 0.35];

  for (const q of qualities) {
    try {
      const blob = await blobToWebP(canvas, q);
      if (blob.size <= MAX_OUTPUT_BYTES) return blob;
    } catch {
      // continue
    }
  }

  // Last resort: JPEG at low quality
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.35),
  );
}

/**
 * Extra compression pass for blobs that exceed PRE_UPLOAD_MAX_BYTES (500KB).
 * Runs an additional WEBP/JPEG compression at quality 0.5 on the blob.
 * This is a safety net — processImage should rarely produce blobs this large.
 */
export async function ensureUnder500KB(blob: Blob): Promise<Blob> {
  if (blob.size <= PRE_UPLOAD_MAX_BYTES) return blob;

  console.warn(
    `[imageProcessor] Blob ${Math.round(blob.size / 1024)}KB exceeds 500KB — running extra compression pass`,
  );

  const img = await loadImageBitmap(blob);
  const { w, h } = getImageDimensions(img);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img as CanvasImageSource, 0, 0);

  // Force quality 0.5, which typically cuts size in half
  const compressed = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => {
        if (b && b.size > 0) resolve(b);
        else canvas.toBlob((jb) => resolve(jb!), "image/jpeg", 0.4);
      },
      "image/webp",
      0.5,
    );
  });

  canvas.width = 0;
  canvas.height = 0;

  console.log(
    `[imageProcessor] Extra compression: ${Math.round(blob.size / 1024)}KB → ${Math.round(compressed.size / 1024)}KB`,
  );

  return compressed;
}

export async function processImage(
  file: File,
  options?: ProcessOptions,
  cropRect?: CropRect,
): Promise<ProcessedImage> {
  const targetSize = options?.targetSize ?? 512;
  const quality = options?.quality ?? 0.85;
  let heicWarning: string | undefined;

  // Handle HEIC — never throw, always attempt fallback
  let sourceFile = file;
  if (isHeic(file)) {
    const result = await loadHeic(file);
    sourceFile = result.file;
    heicWarning = result.warning;
  }

  // ── EXIF orientation correction ──
  // Read orientation before creating ImageBitmap (which may strip EXIF)
  let exifOrientation = 1;
  try {
    const buffer = await sourceFile.arrayBuffer();
    exifOrientation = readExifOrientation(buffer);
  } catch {
    // Non-fatal — proceed with default orientation
  }

  // Load image (createImageBitmap preferred for WebView perf)
  let img: ImageBitmap | HTMLImageElement;
  try {
    img = await loadImageBitmap(sourceFile);
  } catch {
    throw new Error(
      "Could not read this image file. Please convert it to JPG or PNG and try again.",
    );
  }

  const { w: srcW, h: srcH } = getImageDimensions(img);

  // ── Apply EXIF orientation correction if needed ──
  // For orientations 5-8 (90°/270° rotations) dimensions are swapped
  const needsRotation = exifOrientation >= 5 && exifOrientation <= 8;
  let correctedW = needsRotation ? srcH : srcW;
  let correctedH = needsRotation ? srcW : srcH;

  if (exifOrientation > 1) {
    try {
      const orientCanvas = document.createElement("canvas");
      orientCanvas.width = correctedW;
      orientCanvas.height = correctedH;
      const orientCtx = orientCanvas.getContext("2d")!;
      applyExifOrientationTransform(orientCtx, exifOrientation, srcW, srcH);
      orientCtx.drawImage(img as CanvasImageSource, 0, 0);

      const correctedBlob = await new Promise<Blob>((res) =>
        orientCanvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
      );
      orientCanvas.width = 0;
      orientCanvas.height = 0;

      // Replace img with the orientation-corrected version
      try {
        img = await createImageBitmap(correctedBlob);
      } catch {
        img = await loadImageBitmap(correctedBlob);
      }
    } catch {
      // Orientation fix failed — proceed with original (better than failing)
    }
  }

  // ── Step 1: Optional downscale pass to prevent OOM on large images ──
  let workImg: ImageBitmap | HTMLImageElement = img;
  let workW = correctedW;
  let workH = correctedH;

  if (correctedW > DOWNSCALE_THRESHOLD || correctedH > DOWNSCALE_THRESHOLD) {
    try {
      const scale = DOWNSCALE_THRESHOLD / Math.max(correctedW, correctedH);
      const dw = Math.round(correctedW * scale);
      const dh = Math.round(correctedH * scale);

      const interCanvas = document.createElement("canvas");
      interCanvas.width = dw;
      interCanvas.height = dh;
      const interCtx = interCanvas.getContext("2d")!;
      drawTile(interCtx, img, 0, 0, correctedW, correctedH, 0, 0, dw, dh);

      const interBlob = await new Promise<Blob>((res) =>
        interCanvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
      );
      try {
        workImg = await createImageBitmap(interBlob);
      } catch {
        workImg = await loadImageBitmap(interBlob);
      }
      workW = dw;
      workH = dh;

      interCanvas.width = 0;
      interCanvas.height = 0;
    } catch {
      workImg = img;
      workW = correctedW;
      workH = correctedH;
    }
  }

  // ── Step 2: Center-crop (or user-defined crop) → targetSize ──
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d")!;

  let sx: number;
  let sy: number;
  let sSize: number;

  if (cropRect) {
    // Scale the crop rect relative to the current workW/workH
    const scaleX = workW / (needsRotation ? srcH : srcW);
    const scaleY = workH / (needsRotation ? srcW : srcH);
    sx = cropRect.x * scaleX;
    sy = cropRect.y * scaleY;
    const sw = cropRect.width * scaleX;
    const sh = cropRect.height * scaleY;
    sSize = Math.min(sw, sh);
  } else {
    // Smart center crop: largest centered square
    sSize = Math.min(workW, workH);
    sx = (workW - sSize) / 2;
    sy = (workH - sSize) / 2;
  }

  try {
    drawTile(ctx, workImg, sx, sy, sSize, sSize, 0, 0, targetSize, targetSize);
  } catch {
    canvas.width = 256;
    canvas.height = 256;
    try {
      drawTile(ctx, workImg, sx, sy, sSize, sSize, 0, 0, 256, 256);
    } catch {
      throw new Error(
        "Image is too large to process on this device. Please use a smaller image.",
      );
    }
  }

  let blob = await compressToLimit(canvas, quality);

  // ── Pre-upload size check: extra compression pass if > 500KB ──
  blob = await ensureUnder500KB(blob);

  const format = blob.type === "image/webp" ? "WEBP" : "JPEG";
  const previewUrl = URL.createObjectURL(blob);

  canvas.width = 0;
  canvas.height = 0;

  return {
    blob,
    previewUrl,
    width: targetSize,
    height: targetSize,
    format,
    sizeKB: Math.round(blob.size / 1024),
    heicWarning,
  };
}
