/** Detecção heurística de alvos com X branco em fotos aéreas (canvas). */

export interface WhiteXDetection {
  pixelX: number;
  pixelY: number;
  score: number;
}

function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function crossScore(gray: Float32Array, width: number, height: number, cx: number, cy: number, arm: number) {
  let armSum = 0;
  let armN = 0;
  for (let d = -arm; d <= arm; d++) {
    if (d === 0) continue;
    const hx = cx + d;
    const vy = cy + d;
    if (hx >= 0 && hx < width) {
      armSum += gray[cy * width + hx];
      armN++;
    }
    if (vy >= 0 && vy < height) {
      armSum += gray[vy * width + cx];
      armN++;
    }
  }
  return armN ? armSum / armN : 0;
}

function ringAverage(gray: Float32Array, width: number, cx: number, cy: number, inner: number, outer: number) {
  let sum = 0;
  let n = 0;
  for (let dy = -outer; dy <= outer; dy++) {
    for (let dx = -outer; dx <= outer; dx++) {
      if (Math.abs(dx) <= inner || Math.abs(dy) <= inner) continue;
      const d = Math.hypot(dx, dy);
      if (d < inner + 1 || d > outer) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= width || y >= gray.length / width) continue;
      sum += gray[y * width + x];
      n++;
    }
  }
  return n ? sum / n : 0;
}

function suppressNearby(candidates: WhiteXDetection[], minDist: number) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const kept: WhiteXDetection[] = [];
  for (const c of sorted) {
    if (kept.every((k) => Math.hypot(k.pixelX - c.pixelX, k.pixelY - c.pixelY) >= minDist)) {
      kept.push(c);
    }
  }
  return kept;
}

/** Detecta marcas em ImageData já escalada; retorna coords na resolução original. */
export function detectWhiteXInImageData(
  imageData: ImageData,
  originalWidth: number,
  originalHeight: number,
): WhiteXDetection[] {
  const { width, height, data } = imageData;
  const scaleX = originalWidth / width;
  const scaleY = originalHeight / height;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    gray[i] = luminance(data[o], data[o + 1], data[o + 2]);
  }

  const arm = Math.max(6, Math.round(Math.min(width, height) * 0.012));
  const ringIn = arm + 2;
  const ringOut = arm + 10;
  const candidates: WhiteXDetection[] = [];

  for (let y = ringOut; y < height - ringOut; y += 2) {
    for (let x = ringOut; x < width - ringOut; x += 2) {
      const center = gray[y * width + x];
      if (center < 195) continue;
      const ring = ringAverage(gray, width, x, y, ringIn, ringOut);
      if (center - ring < 35) continue;
      const arms = crossScore(gray, width, height, x, y, arm);
      if (arms < 175 || arms - ring < 25) continue;
      const score = center - ring + (arms - ring) * 0.4;
      candidates.push({
        pixelX: x * scaleX,
        pixelY: y * scaleY,
        score,
      });
    }
  }

  const minDist = Math.max(20, Math.min(originalWidth, originalHeight) * 0.03);
  return suppressNearby(candidates, minDist / Math.max(scaleX, scaleY)).slice(0, 24);
}

export async function detectWhiteXInFile(file: File): Promise<WhiteXDetection[]> {
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));
  const cw = Math.max(1, Math.round(originalWidth * scale));
  const ch = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return [];
  }
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  bitmap.close();
  const imageData = ctx.getImageData(0, 0, cw, ch);
  return detectWhiteXInImageData(imageData, originalWidth, originalHeight);
}
