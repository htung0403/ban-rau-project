/**
 * Cloudinary URL optimization utility.
 *
 * Transforms raw Cloudinary URLs to include responsive resize, auto quality, and auto format.
 * This reduces bandwidth by 60-80% compared to serving original full-size images.
 *
 * Example:
 *   Input:  https://res.cloudinary.com/xxx/image/upload/folder/image.webp
 *   Output: https://res.cloudinary.com/xxx/image/upload/w_800,q_auto,f_auto,c_fill,g_auto/folder/image.webp
 */

export type CloudinarySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE_MAP: Record<CloudinarySize, number> = {
  xs: 150,   // Thumbnails, avatars, icons
  sm: 320,   // Small cards, list previews
  md: 640,   // Medium cards, dialog thumbnails
  lg: 1024,  // Hero images, detail views
  xl: 1600,  // Full-screen / zoom view
  full: 0,   // No resize (original)
};

/**
 * Check if a URL is a Cloudinary image URL.
 */
export function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
}

/**
 * Transform a Cloudinary URL with optimization parameters.
 *
 * @param url - Raw Cloudinary URL
 * @param size - Preset size ('xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full') or explicit pixel width
 * @param crop - Crop mode ('fill', 'thumb', 'scale', 'limit', 'fit'). Default: 'fill'
 * @param gravity - Gravity for crop ('auto', 'face', 'center', etc.). Default: 'auto'
 * @returns Optimized Cloudinary URL
 */
export function optimizeCloudinaryUrl(
  url: string | null | undefined,
  size: CloudinarySize | number = 'md',
  crop: 'fill' | 'thumb' | 'scale' | 'limit' | 'fit' = 'fill',
  gravity: string = 'auto'
): string {
  if (!url || typeof url !== 'string') return url || '';

  // If not a Cloudinary URL, return as-is (e.g., base64 data URIs, external URLs)
  if (!isCloudinaryUrl(url)) return url;

  // Determine width
  const width = typeof size === 'number' ? size : SIZE_MAP[size] ?? 640;

  // If 'full' size requested, return original URL
  if (size === 'full') return url;

  // Cloudinary URL format: .../image/upload/[transformations]/folder/public_id.ext
  // We need to insert transformations after '/upload/' (or '/upload/v1234567890/' if version exists)
  const transformations = `w_${width},q_auto,f_auto,c_${crop},g_${gravity}`;

  // Match /upload/ optionally followed by version number like /v1234567890/
  const uploadPattern = /(\/image\/upload\/)(v\d+\/)?/;
  const match = url.match(uploadPattern);

  if (match) {
    const insertPoint = match.index! + match[1].length;
    return url.slice(0, insertPoint) + transformations + '/' + url.slice(insertPoint);
  }

  // Fallback: if pattern doesn't match, append before the last path segment
  // This handles edge cases like custom CNAME domains
  const lastSlash = url.lastIndexOf('/');
  if (lastSlash > 0) {
    return url.slice(0, lastSlash) + `/${transformations}/` + url.slice(lastSlash + 1);
  }

  return url;
}

/**
 * Get a thumbnail-sized Cloudinary URL (150px).
 * Use for: avatars, small icons, list thumbnails.
 */
export function cloudinaryThumb(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 'xs', 'thumb', 'face');
}

/**
 * Get a small Cloudinary URL (320px).
 * Use for: card previews, list items.
 */
export function cloudinarySmall(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 'sm');
}

/**
 * Get a medium Cloudinary URL (640px).
 * Use for: dialog thumbnails, detail previews.
 */
export function cloudinaryMedium(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 'md');
}

/**
 * Get a large Cloudinary URL (1024px).
 * Use for: detail views, hero images.
 */
export function cloudinaryLarge(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 'lg');
}

/**
 * Get a full-size Cloudinary URL (1600px).
 * Use for: fullscreen/zoom overlay views.
 */
export function cloudinaryFull(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 'xl');
}
