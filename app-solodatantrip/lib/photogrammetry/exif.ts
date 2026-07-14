import exifr from "exifr";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME, MAX_FILE_BYTES } from "@/lib/constants";
import type { PhotoAsset } from "./types";

function newPhotoId() {
  return `img_${Math.random().toString(36).slice(2, 10)}`;
}

export function isAllowedPhoto(file: File): boolean {
  if (file.size > MAX_FILE_BYTES) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return ALLOWED_EXTENSIONS.has(ext);
  }
  return true;
}

export async function parsePhotoFile(file: File): Promise<PhotoAsset> {
  const thumbUrl = URL.createObjectURL(file);
  let meta: Record<string, unknown> = {};
  try {
    meta = (await exifr.parse(file, { gps: true, xmp: true, exif: true, tiff: true })) as Record<string, unknown>;
  } catch {
    // EXIF opcional
  }

  const lat = typeof meta.latitude === "number" ? meta.latitude : undefined;
  const lon = typeof meta.longitude === "number" ? meta.longitude : undefined;
  const alt =
    typeof meta.GPSAltitude === "number"
      ? meta.GPSAltitude
      : typeof meta.altitude === "number"
        ? meta.altitude
        : undefined;

  return {
    id: newPhotoId(),
    fileName: file.name,
    thumbUrl,
    sizeBytes: file.size,
    width: typeof meta.ImageWidth === "number" ? meta.ImageWidth : typeof meta.ExifImageWidth === "number" ? meta.ExifImageWidth : undefined,
    height: typeof meta.ImageHeight === "number" ? meta.ImageHeight : typeof meta.ExifImageHeight === "number" ? meta.ExifImageHeight : undefined,
    lat,
    lon,
    alt,
    yaw: typeof meta.GimbalYawDegree === "number" ? meta.GimbalYawDegree : undefined,
    pitch: typeof meta.GimbalPitchDegree === "number" ? meta.GimbalPitchDegree : undefined,
    roll: typeof meta.GimbalRollDegree === "number" ? meta.GimbalRollDegree : undefined,
    capturedAt:
      meta.DateTimeOriginal instanceof Date
        ? meta.DateTimeOriginal.toISOString()
        : typeof meta.CreateDate === "string"
          ? meta.CreateDate
          : undefined,
    camera: typeof meta.Model === "string" ? meta.Model : undefined,
    hasGps: lat != null && lon != null,
  };
}

export async function parsePhotoFiles(files: File[]): Promise<{ accepted: PhotoAsset[]; rejected: string[] }> {
  const accepted: PhotoAsset[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (!isAllowedPhoto(file)) {
      rejected.push(file.name);
      continue;
    }
    accepted.push(await parsePhotoFile(file));
  }
  return { accepted, rejected };
}
