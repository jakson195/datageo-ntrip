"use client";

import { useTranslations } from "next-intl";
import type { QualityDailyRecord } from "@/lib/rtk-validation/types";

function BarChart({ data, label, color, max }: { data: number[]; label: string; color: string; max: number }) {
  const w = 280;
  const h = 80;
  const barW = data.length > 0 ? w / data.length - 4 : 0;
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[#6b7280]">{label}</p>
      <svg width={w} height={h}>
        {data.map((v, i) => {
          const barH = max > 0 ? (v / max) * (h - 10) : 0;
          return <rect key={i} x={i * (barW + 4) + 2} y={h - barH} width={barW} height={barH} fill={color} rx={2} opacity={0.85} />;
        })}
      </svg>
    </div>
  );
}

export function QualityDashboard({ records, loading }: { records: QualityDailyRecord[]; loading?: boolean }) {
  const t = useTranslations("rtkValidation.quality");
  if (loading) return <div className="rounded-xl border bg-white p-6 text-sm text-[#6b7280]">{t("loading")}</div>;
  if (records.length === 0) return <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-[#6b7280]">{t("empty")}</div>;

  const fixRates = records.map((r) => { const t = r.fixCount + r.floatCount; return t > 0 ? (r.fixCount / t) * 100 : 0; });
  const precision = records.map((r) => r.avgHorizPrecision ?? 0);
  const uptime = records.map((r) => r.uptimePercent ?? 0);
  const latency = records.map((r) => r.avgLatencyMs ?? 0);
  const latest = records[records.length - 1];
  const fixTotal = latest.fixCount + latest.floatCount;
  const fixRate = fixTotal > 0 ? ((latest.fixCount / fixTotal) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("fixRate"), value: `${fixRate}%` },
          { label: t("avgSats"), value: latest.avgSatellites?.toFixed(1) ?? "—" },
          { label: t("avgHdop"), value: latest.avgHdop?.toFixed(2) ?? "—" },
          { label: t("uptime"), value: latest.uptimePercent != null ? `${latest.uptimePercent.toFixed(1)}%` : "—" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4">
            <p className="text-xs font-medium uppercase text-[#6b7280]">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#0f2848]">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 rounded-xl border bg-white p-5 lg:grid-cols-2">
        <BarChart data={fixRates} label={t("chartFixRate")} color="#22c55e" max={100} />
        <BarChart data={precision} label={t("chartPrecision")} color="#38bdf8" max={Math.max(...precision, 0.05)} />
        <BarChart data={uptime} label={t("chartAvailability")} color="#a78bfa" max={100} />
        <BarChart data={latency} label={t("chartLatency")} color="#f59e0b" max={Math.max(...latency, 500)} />
      </div>
    </div>
  );
}
