import Image from 'next/image';
import { createImageUrlBuilder } from '@sanity/image-url';
import type { ContentPhoto } from '@/lib/types';
import { demoEnabled } from '@/lib/content';
export function ContentImage({
  image,
  demoSrc,
  width,
  height,
  className,
  priority = false,
  preserveFullImage = false,
  sizes = '(max-width: 767px) 90vw, (max-width: 1100px) 45vw, 33vw',
}: {
  image?: ContentPhoto;
  demoSrc?: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  preserveFullImage?: boolean;
  sizes?: string;
}) {
  if (image?.asset?._ref && process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    // Full-body cutouts must retain their original ratio and bypass editorial crops.
    let outputWidth = width;
    let outputHeight = height;
    const dimensions = image.asset._ref.match(/-(\d+)x(\d+)-[a-z]+$/i);
    if (preserveFullImage && dimensions) {
      const originalWidth = Number(dimensions[1]);
      const originalHeight = Number(dimensions[2]);
      if (originalWidth > 0 && originalHeight > 0) {
        const scale = Math.min(width / originalWidth, height / originalHeight, 1);
        outputWidth = Math.max(1, Math.round(originalWidth * scale));
        outputHeight = Math.max(1, Math.round(originalHeight * scale));
      }
    }
    const src = createImageUrlBuilder({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    })
      .image(preserveFullImage ? { asset: image.asset } : image)
      .width(outputWidth)
      .height(outputHeight)
      .fit(preserveFullImage ? 'max' : 'crop')
      .auto('format')
      .url();
    return (
      <Image
        src={src}
        alt={image.alt}
        width={outputWidth}
        height={outputHeight}
        className={className}
        priority={priority}
        sizes={sizes}
      />
    );
  }
  if (demoEnabled && (image?.demoSrc || demoSrc))
    return (
      <img
        src={image?.demoSrc || demoSrc}
        alt={image?.alt || 'Placeholder fashion photograph, not the reviewer'}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
      />
    );
  return (
    <div
      className={`image-placeholder ${className || ''}`}
      style={{ aspectRatio: `${width}/${height}` }}
      role="img"
      aria-label="Photograph awaiting publication"
    />
  );
}
