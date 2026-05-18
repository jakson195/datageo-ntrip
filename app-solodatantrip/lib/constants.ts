/** Max size per uploaded image (50 MB). */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "tif",
  "tiff",
]);

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/tiff",
]);
