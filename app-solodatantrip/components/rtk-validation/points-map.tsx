"use client";

import { useEffect, useMemo, useState } from "react";
import { runQueuedInEffect } from "@/lib/react/queue-in-effect";
import { useTranslations } from "next-intl";
import type { ControlPointWithStats, SurveyPoint } from "@/lib/rtk-validation/types";
import { latLonToEn, surveyCenterLatLon } from "@/lib/rtk-validation/project-coords";

type NtripBase = {
  mountpoint: string;
  identifier: string;
  network: string;
  country: string;
  latitude: number;
  longitude: number;
  navSystem: string;
  distanceKm: number;
  status: string;
  quality?: number;
};

function surveyCoord(pt: SurveyPoint) {
  return { e: pt.eCorr ?? pt.e, n: pt.nCorr ?? pt.n };
}

function bounds(points: { e: number; n: number }[]) {
  if (points.length === 0) return { minE: 0, maxE: 1, minN: 0, maxN: 1 };
  let minE = Infinity, maxE = -Infinity, minN = Infinity, maxN = -Infinity;
  for (const p of points) {
    minE = Math.min(minE, p.e); maxE = Math.max(maxE, p.e);
    minN = Math.min(minN, p.n); maxN = Math.max(maxN, p.n);
  }
  const dE = (maxE - minE) * 0.12 || 500;
  const dN = (maxN - minN) * 0.12 || 500;
  return { minE: minE - dE, maxE: maxE + dE, minN: minN - dN, maxN: maxN + dN };
}

export function PointsMap({
  surveyPoints,
  controlPoints = [],
  ntripServer,
  ntripPort = "2101",
  className = "",
  width = 560,
  height = 320,
}: {
  surveyPoints: SurveyPoint[];
  controlPoints?: ControlPointWithStats[];
  ntripServer?: string;
  ntripPort?: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  const t = useTranslations("rtkValidation.map");
  const [bases, setBases] = useState<NtripBase[]>([]);
  const [basesLoading, setBasesLoading] = useState(false);
  const [basesError, setBasesError] = useState<string | null>(null);

  const surveyEn = useMemo(() => surveyPoints.map(surveyCoord), [surveyPoints]);
  const center = useMemo(() => surveyCenterLatLon(surveyEn), [surveyEn]);

  const projectedBases = useMemo(
    () =>
      bases.map((base) => {
        const { e, n } = latLonToEn(base.latitude, base.longitude, center.zone);
        return { ...base, e, n };
      }),
    [bases, center.zone],
  );

  useEffect(
    () =>
      runQueuedInEffect(() => {
        if (!ntripServer || surveyEn.length === 0) {
          setBases([]);
          return;
        }

        const controller = new AbortController();
        setBasesLoading(true);
        setBasesError(null);

        const params = new URLSearchParams({
          lat: String(center.lat),
          lon: String(center.lon),
          server: ntripServer,
          port: ntripPort,
          radius: "250",
          limit: "35",
        });

        fetch(`/api/rtk-validation/ntrip-bases?${params}`, { signal: controller.signal })
          .then(async (res) => {
            const data = (await res.json()) as { bases?: NtripBase[]; error?: string };
            if (!res.ok) throw new Error(data.error ?? "Erro ao carregar bases");
            setBases(data.bases ?? []);
          })
          .catch((err) => {
            if (controller.signal.aborted) return;
            setBases([]);
            setBasesError(err instanceof Error ? err.message : "Erro ao carregar bases");
          })
          .finally(() => {
            if (!controller.signal.aborted) setBasesLoading(false);
          });

        return () => controller.abort();
      }),
    [ntripServer, ntripPort, center.lat, center.lon, surveyEn.length],
  );

  const all = [
    ...surveyEn,
    ...controlPoints.flatMap((p) => [
      { e: p.eObserved, n: p.nObserved },
      { e: p.eKnown, n: p.nKnown },
    ]),
    ...projectedBases.map((b) => ({ e: b.e, n: b.n })),
  ];
  const b = bounds(all);
  const sx = (e: number) => ((e - b.minE) / (b.maxE - b.minE)) * (width - 40) + 20;
  const sy = (n: number) => height - 20 - ((n - b.minN) / (b.maxN - b.minN)) * (height - 40);

  return (
    <div className={`rtk-map-panel overflow-hidden rounded-xl border border-[#d1d5db] bg-[#0b1220] text-[#e2e8f0] ${className}`}>
      <div className="border-b border-[#1e293b] px-3 py-2">
        <p className="text-xs font-semibold text-[#00c8f0]">{t("title")}</p>
        <p className="text-[10px] text-[#94a3b8]">
          {ntripServer ? `${t("caster")}: ${ntripServer}:${ntripPort}` : t("noCaster")}
        </p>
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
        <rect width={width} height={height} fill="#0b1220" />
        <g opacity={0.25}>
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h-${i}`} x1={20} x2={width - 20} y1={20 + i * ((height - 40) / 5)} y2={20 + i * ((height - 40) / 5)} stroke="#1e3a5f" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`v-${i}`} y1={20} y2={height - 20} x1={20 + i * ((width - 40) / 5)} x2={20 + i * ((width - 40) / 5)} stroke="#1e3a5f" />
          ))}
        </g>

        {projectedBases.map((base) => {
          const cx = sx(base.e);
          const cy = sy(base.n);
          const label = base.mountpoint.length > 8 ? base.mountpoint.slice(0, 8) : base.mountpoint;
          return (
            <g key={`${base.mountpoint}-${base.latitude}`}>
              <polygon
                points={`${cx},${cy - 7} ${cx - 6},${cy + 5} ${cx + 6},${cy + 5}`}
                fill="#8fd400"
                stroke="#4d7c0f"
                strokeWidth={1}
              />
              <text x={cx + 8} y={cy + 2} fill="#bbf7d0" fontSize={8}>
                {label}
              </text>
            </g>
          );
        })}

        {surveyPoints.map((pt) => {
          const c = surveyCoord(pt);
          const label = pt.code || pt.description || pt.name;
          return (
            <g key={pt.id}>
              <circle cx={sx(c.e)} cy={sy(c.n)} r={4} fill="#38bdf8" />
              <text x={sx(c.e) + 6} y={sy(c.n) + 3} fill="#e2e8f0" fontSize={9}>
                {label}
              </text>
            </g>
          );
        })}

        {controlPoints.map((cp) => (
          <g key={cp.id}>
            <circle cx={sx(cp.eObserved)} cy={sy(cp.nObserved)} r={5} fill="#f59e0b" />
            <circle cx={sx(cp.eKnown)} cy={sy(cp.nKnown)} r={5} fill="none" stroke="#22c55e" strokeWidth={2} />
            <line
              x1={sx(cp.eObserved)}
              y1={sy(cp.nObserved)}
              x2={sx(cp.eKnown)}
              y2={sy(cp.nKnown)}
              stroke={cp.isOutlier ? "#ef4444" : "#a78bfa"}
              strokeWidth={1.5}
            />
          </g>
        ))}
      </svg>

      <div className="border-t border-[#1e293b] px-3 py-2 text-[10px]">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span><span className="inline-block h-2 w-2 rounded-full bg-[#38bdf8]" /> {t("legendSurvey")}</span>
          <span><span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" /> {t("legendObserved")}</span>
          <span><span className="inline-block h-2 w-2 rounded-full border border-[#22c55e]" /> {t("legendKnown")}</span>
          <span><span className="text-[#8fd400]">▲</span> {t("legendBase")}</span>
        </div>
      </div>

      <div className="max-h-36 overflow-y-auto border-t border-[#1e293b] px-3 py-2 text-[10px]">
        <p className="mb-1 font-semibold text-[#00c8f0]">
          {basesLoading ? t("basesLoading") : t("basesNearby", { count: projectedBases.length })}
        </p>
        {basesError && <p className="text-amber-400">{basesError}</p>}
        {!basesLoading && !basesError && projectedBases.length === 0 && (
          <p className="text-[#94a3b8]">{t("basesEmpty")}</p>
        )}
        {projectedBases.slice(0, 12).map((base) => (
          <div key={`${base.mountpoint}-row`} className="border-b border-[#1e293b]/60 py-1 last:border-b-0">
            <p className="font-medium text-[#e2e8f0]">
              {base.mountpoint}
              <span className="ml-1 text-[#94a3b8]">({base.distanceKm.toFixed(1)} km)</span>
            </p>
            <p className="text-[#94a3b8]">
              {base.network} · {base.status}
              {base.quality ? ` · Q${base.quality}` : ""} · {base.latitude.toFixed(5)}°, {base.longitude.toFixed(5)}°
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
