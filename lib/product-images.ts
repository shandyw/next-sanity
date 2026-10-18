/** Shared portrait image contract for shopping cards and Studio previews. */
export const PRODUCT_IMAGE = {
  width: 1080,
  height: 1350,
  aspectRatio: 4 / 5,
  minimumWidth: 800,
  minimumHeight: 1000,
  maxBytes: 20_000_000,
} as const;

export function productImageResolutionWarning(image?: {
  asset?: { _ref?: string };
  crop?: { left?: number; right?: number; top?: number; bottom?: number };
}): true | string {
  const dimensions = image?.asset?._ref?.match(/-(\d+)x(\d+)-[a-z]+$/i);
  if (!dimensions) return true;
  const crop = image?.crop;
  const width = Number(dimensions[1]) * (1 - (crop?.left || 0) - (crop?.right || 0));
  const height = Number(dimensions[2]) * (1 - (crop?.top || 0) - (crop?.bottom || 0));
  const portraitWidth = Math.min(width, height * PRODUCT_IMAGE.aspectRatio);
  const portraitHeight = Math.min(height, width / PRODUCT_IMAGE.aspectRatio);
  return portraitWidth >= PRODUCT_IMAGE.minimumWidth &&
    portraitHeight >= PRODUCT_IMAGE.minimumHeight
    ? true
    : 'This 4:5 crop is below 800 × 1000 px. Use a larger photo where possible; 1080 × 1350 px is recommended.';
}
