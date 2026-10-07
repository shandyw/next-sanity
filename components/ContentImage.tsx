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
}: {
  image?: ContentPhoto;
  demoSrc?: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  if (image?.asset?._ref && process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    const src = createImageUrlBuilder({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    })
      .image(image)
      .width(width)
      .height(height)
      .fit('crop')
      .auto('format')
      .url();
    return (
      <Image
        src={src}
        alt={image.alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        sizes="(max-width: 767px) 90vw, (max-width: 1100px) 45vw, 33vw"
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
