export interface ViewportDimensions {
  width: number;
  height: number;
}

/**
 * Computes exact fitted dimensions for an image inside a viewport stage so that:
 * - The entire image fits completely inside the available stage space without overflow or cropping.
 * - The image's natural aspect ratio is preserved (both small presets scaled up and large photos scaled down).
 */
export function computeFittedViewportDimensions(
  stageWidth: number,
  stageHeight: number,
  naturalWidth: number,
  naturalHeight: number
): ViewportDimensions | null {
  if (
    !Number.isFinite(stageWidth) ||
    !Number.isFinite(stageHeight) ||
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    stageWidth <= 0 ||
    stageHeight <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return null;
  }

  const scale = Math.min(stageWidth / naturalWidth, stageHeight / naturalHeight);
  const width = Math.min(stageWidth, Math.max(1, Math.floor(naturalWidth * scale * 100) / 100));
  const height = Math.min(stageHeight, Math.max(1, Math.floor(naturalHeight * scale * 100) / 100));

  return { width, height };
}
