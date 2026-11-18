/**
 * Pure and browser-safe JPEG conversion & export utilities for Defect Detection inspection images.
 */

const RECOGNIZED_IMAGE_EXTENSIONS_RE = /\.(svg|png|jpe?g|webp|gif|bmp|tiff?)$/i;

/**
 * Ensures any downloaded image filename uses a `.jpg` extension.
 */
export function ensureJpegFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return 'inspection_image.jpg';
  }
  const withoutQuery = trimmed.split(/[?#]/)[0];
  if (RECOGNIZED_IMAGE_EXTENSIONS_RE.test(withoutQuery)) {
    return withoutQuery.replace(RECOGNIZED_IMAGE_EXTENSIONS_RE, '.jpg');
  }
  return `${withoutQuery}.jpg`;
}

/**
 * Extracts target canvas dimensions from an SVG markup string (`viewBox` or `width`/`height`).
 */
export function extractSvgDimensions(svgMarkup: string): { width: number; height: number } {
  const viewBoxMatch = svgMarkup.match(/viewBox\s*=\s*["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (viewBoxMatch) {
    const w = Math.round(Number(viewBoxMatch[1]));
    const h = Math.round(Number(viewBoxMatch[2]));
    if (w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }

  const widthMatch = svgMarkup.match(/<svg[^>]*\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i);
  const heightMatch = svgMarkup.match(/<svg[^>]*\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i);
  if (widthMatch && heightMatch) {
    const w = Math.round(Number(widthMatch[1]));
    const h = Math.round(Number(heightMatch[1]));
    if (w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }

  return { width: 800, height: 600 };
}

function decodeSvgDataUrl(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return dataUrl;
  }
  const meta = dataUrl.slice(0, commaIdx).toLowerCase();
  const payload = dataUrl.slice(commaIdx + 1);
  if (meta.includes(';base64')) {
    return atob(payload);
  }
  return decodeURIComponent(payload);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image blob to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Inlines external `<image href="/...">` references inside an SVG string as data URLs
 * so rendering the SVG into an HTMLImageElement for canvas export never drops sub-images.
 */
async function inlineSvgExternalImages(svgMarkup: string): Promise<string> {
  const hrefRegex = /(<image\b[^>]*?\b(?:xlink:)?href\s*=\s*)(["'])([^"']+)\2/gi;
  const matches = Array.from(svgMarkup.matchAll(hrefRegex));
  if (matches.length === 0) {
    return svgMarkup;
  }

  let updated = svgMarkup;
  const resolvedCache = new Map<string, string>();

  for (const match of matches) {
    const url = match[3];
    if (!url || url.startsWith('data:') || url.startsWith('#')) {
      continue;
    }

    let inlined = resolvedCache.get(url);
    if (!inlined) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          inlined = await blobToDataUrl(blob);
          resolvedCache.set(url, inlined);
        }
      } catch {
        // Ignore fetch errors and keep original reference
      }
    }

    if (inlined) {
      updated = updated.replace(match[0], `${match[1]}${match[2]}${inlined}${match[2]}`);
    }
  }

  return updated;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image for JPEG conversion: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

/**
 * Converts any image URL or data URL (including SVG with embedded annotations) into a JPEG Blob.
 */
export async function convertImageSourceToJpegBlob(
  sourceUrl: string,
  quality: number = 0.92
): Promise<Blob> {
  const isSvg = /^data:image\/svg\+xml/i.test(sourceUrl) || /\.svg(\?|$)/i.test(sourceUrl);

  let targetWidth = 0;
  let targetHeight = 0;
  let loadSrc = sourceUrl;
  let tempObjectUrl: string | null = null;

  try {
    if (isSvg) {
      let svgMarkup: string;
      if (sourceUrl.startsWith('data:image/svg+xml')) {
        svgMarkup = decodeSvgDataUrl(sourceUrl);
      } else {
        const res = await fetch(sourceUrl);
        svgMarkup = await res.text();
      }

      svgMarkup = await inlineSvgExternalImages(svgMarkup);
      const dims = extractSvgDimensions(svgMarkup);
      targetWidth = dims.width;
      targetHeight = dims.height;

      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      tempObjectUrl = URL.createObjectURL(svgBlob);
      loadSrc = tempObjectUrl;
    }

    const img = await loadImageElement(loadSrc);
    const width = img.naturalWidth || targetWidth || 800;
    const height = img.naturalHeight || targetHeight || 600;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }

    // Paint an opaque base so transparent PNG/SVG areas flatten cleanly into JPEG
    ctx.fillStyle = isSvg ? '#0F172A' : '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas JPEG encoding failed'));
          }
        },
        'image/jpeg',
        quality
      );
    });

    return jpegBlob;
  } finally {
    if (tempObjectUrl) {
      URL.revokeObjectURL(tempObjectUrl);
    }
  }
}

/**
 * Exports any inspection image (original or annotated) as an actual JPEG (`.jpg`) file download.
 */
export async function downloadImageAsJpeg(sourceUrl: string, filename: string): Promise<void> {
  const jpegFilename = ensureJpegFilename(filename);
  const jpegBlob = await convertImageSourceToJpegBlob(sourceUrl, 0.92);
  const downloadUrl = URL.createObjectURL(jpegBlob);

  try {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = jpegFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }
}
