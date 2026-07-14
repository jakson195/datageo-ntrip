"use client";

import { useMemo } from "react";
import type { PhotoAsset } from "@/lib/photogrammetry/types";

function bounds(photos: PhotoAsset[]) {
  const withGps = photos.filter((p) => p.hasGps && p.lat != null && p.lon != null);
  if (withGps.length === 0) return { minLat: -23.5, maxLat: -23.4, minLon: -46.7, maxLon: -46.6 };
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const p of withGps) {
    minLat = Math.min(minLat, p.lat!);
    maxLat = Math.max(maxLat, p.lat!);
    minLon = Math.min(minLon, p.lon!);
    maxLon = Math.max(maxLon, p.lon!);
  }
  const dLat = (maxLat - minLat) * 0.15 || 0.001;
  const dLon = (maxLon - minLon) * 0.15 || 0.001;
  return { minLat: minLat - dLat, maxLat: maxLat + dLat, minLon: minLon - dLon, maxLon: maxLon + dLon };
}

export function PhotoMap({ photos, width = 720, height = 400 }: { photos: PhotoAsset[]; width?: number; height?: number }) {
  const b = useMemo(() => bounds(photos), [photos]);
  const gpsPhotos = photos.filter((p) => p.hasGps);

  function toScreen(lat: number, lon: number) {
    const x = ((lon - b.minLon) / (b.maxLon - b.minLon)) * (width - 40) + 20;
    const y = height - 20 - ((lat - b.minLat) / (b.maxLat - b.minLat)) * (height - 40);
    return { x, y };
  }

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="rounded-lg bg-[#0b1220]">
      <rect width={width} height={height} fill="#0b1220" />
      {gpsPhotos.length >= 2 ? (
        <polyline
          points={gpsPhotos.map((p) => {
            const s = toScreen(p.lat!, p.lon!);
            return `${s.x},${s.y}`;
          }).join(" ")}
          fill="none"
          stroke="#334155"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ) : null}
      {gpsPhotos.map((p) => {
        const s = toScreen(p.lat!, p.lon!);
        const heading = p.yaw ?? 0;
        return (
          <g key={p.id} transform={`translate(${s.x}, ${s.y}) rotate(${heading})`}>
            <polygon points="0,-8 6,6 -6,6" fill="#00c8f0" opacity={0.9} />
          </g>
        );
      })}
      {gpsPhotos.length === 0 ? (
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#64748b" fontSize={13}>
          Nenhuma foto com GPS/EXIF georreferenciado
        </text>
      ) : null}
    </svg>
  );
}
