import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { QualityDailyRecord } from "@/lib/rtk-validation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function seedDemoRecords(): QualityDailyRecord[] {
  const records: QualityDailyRecord[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    records.push({
      date: d.toISOString().slice(0, 10),
      fixCount: 180 + Math.floor(Math.random() * 60),
      floatCount: 10 + Math.floor(Math.random() * 25),
      avgSatellites: 14 + Math.random() * 6,
      avgHdop: 0.8 + Math.random() * 0.6,
      avgVdop: 1.0 + Math.random() * 0.8,
      avgCorrectionAge: 0.5 + Math.random() * 1.5,
      uptimePercent: 92 + Math.random() * 7,
      avgLatencyMs: 80 + Math.random() * 120,
      avgHorizPrecision: 0.012 + Math.random() * 0.02,
      avgVertPrecision: 0.02 + Math.random() * 0.03,
    });
  }
  return records;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const casterHost = session.ntrip.server || "caster.datageo.com.br";
  const since = new Date();
  since.setDate(since.getDate() - 30);

  let records = await prisma.ntripQualityDaily.findMany({
    where: { userId: session.id, casterHost, date: { gte: since } },
    orderBy: { date: "asc" },
    take: 30,
  });

  if (records.length === 0) {
    const demo = seedDemoRecords();
    await prisma.$transaction(
      demo.map((r) =>
        prisma.ntripQualityDaily.upsert({
          where: { userId_casterHost_date: { userId: session.id, casterHost, date: new Date(r.date) } },
          create: {
            userId: session.id, casterHost, date: new Date(r.date),
            fixCount: r.fixCount, floatCount: r.floatCount,
            avgSatellites: r.avgSatellites, avgHdop: r.avgHdop, avgVdop: r.avgVdop,
            avgCorrectionAge: r.avgCorrectionAge, uptimePercent: r.uptimePercent,
            avgLatencyMs: r.avgLatencyMs, avgHorizPrecision: r.avgHorizPrecision, avgVertPrecision: r.avgVertPrecision,
          },
          update: {},
        }),
      ),
    );
    records = await prisma.ntripQualityDaily.findMany({ where: { userId: session.id, casterHost }, orderBy: { date: "asc" } });
  }

  const mapped: QualityDailyRecord[] = records.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    fixCount: r.fixCount,
    floatCount: r.floatCount,
    avgSatellites: r.avgSatellites,
    avgHdop: r.avgHdop,
    avgVdop: r.avgVdop,
    avgCorrectionAge: r.avgCorrectionAge,
    uptimePercent: r.uptimePercent,
    avgLatencyMs: r.avgLatencyMs,
    avgHorizPrecision: r.avgHorizPrecision,
    avgVertPrecision: r.avgVertPrecision,
  }));

  return NextResponse.json({ records: mapped, casterHost });
}
