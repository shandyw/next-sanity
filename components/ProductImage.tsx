import { ContentImage } from './ContentImage';
import type { ContentPhoto } from '@/lib/types';
export function ProductImage({
  image,
  importedImageUrl,
  title,
  width,
  height,
  sizes,
  className,
}: {
  image?: ContentPhoto;
  importedImageUrl?: string;
  title: string;
  width: number;
  height: number;
  sizes?: string;
  className?: string;
}) {
  void importedImageUrl;
  void title;
  return (
    <ContentImage className={className} image={image} width={width} height={height} sizes={sizes} />
  );
}
