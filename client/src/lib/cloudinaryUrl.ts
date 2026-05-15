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
  lg: 1200,  // Consolidated large size for detail/hero views
  xl: 1200,  // Map to 1200 to save transformation variants
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

  // If not a Cloudinary URL, return as-is
  if (!isCloudinaryUrl(url)) return url;

  const width = typeof size === 'number' ? size : SIZE_MAP[size] ?? 640;
  if (size === 'full' || width === 0) return url;

  // Standardize quality and format
  const transformations = `w_${width},q_auto,f_auto,c_${crop},g_${gravity}`;

  // IDEMPOTENCY FIX:
  // We want to avoid adding multiple transformation segments like /upload/w_150/w_640/...
  // We identify the part after '/upload/' and see if it looks like an existing transformation.
  const uploadToken = '/upload/';
  const uploadIndex = url.indexOf(uploadToken);
  if (uploadIndex === -1) return url;

  const prefix = url.substring(0, uploadIndex + uploadToken.length);
  const remainder = url.substring(uploadIndex + uploadToken.length);
  
  // Split the remainder into path segments
  const parts = remainder.split('/');
  
  // Cloudinary URL segments: [transformations]/[version/][folder/]public_id.ext
  // Transformation segments typically contain '_' or ',' and don't start with 'v' + digits
  const firstPart = parts[0];
  const isTransformation = (firstPart.includes('_') || firstPart.includes(',')) && !(/^v\d+$/.test(firstPart));

  if (isTransformation) {
    // If we're already optimized with the SAME string, do nothing
    if (firstPart === transformations) return url;
    
    // Otherwise, replace the existing transformation segment with the new one
    parts[0] = transformations;
  } else {
    // No transformation segment found, insert the new one before everything else
    parts.unshift(transformations);
  }

  return prefix + parts.join('/');
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
