export const wishlistKey = 'curvygirlreviews:wishlist:v1';
export const wishlistLimit = 200;

export function parseWishlist(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== 'object' ||
      !('version' in value) ||
      value.version !== 1 ||
      !('ids' in value) ||
      !Array.isArray(value.ids)
    )
      return [];
    return [
      ...new Set(
        value.ids.filter(
          (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 256,
        ),
      ),
    ].slice(0, wishlistLimit);
  } catch {
    return [];
  }
}
