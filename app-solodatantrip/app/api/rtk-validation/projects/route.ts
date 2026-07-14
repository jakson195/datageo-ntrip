import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const projects = await prisma.rtkSurveyProject.findMany({
    where: { userId: session.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { _count: { select: { surveyPoints: true, controlPoints: true } } },
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = (await request.json()) as {
    name?: string;
    ntripCaster?: string;
    ntripMountpoint?: string;
    adjustmentMethod?: string;
    surveyPoints?: Array<{ name: string; e: number; n: number; z: number; eCorr?: number; nCorr?: number; zCorr?: number }>;
    controlPoints?: Array<{
      name: string; eKnown: number; nKnown: number; zKnown: number;
      eObserved: number; nObserved: number; zObserved: number;
      excluded?: boolean; residualE?: number; residualN?: number; residualZ?: number; isOutlier?: boolean; rms?: number;
    }>;
    adjustmentResult?: { rmsBefore?: number; rmsAfter?: number; params?: unknown };
  };

  if (!body.name || !body.surveyPoints?.length) {
    return NextResponse.json({ error: "Nome e pontos são obrigatórios." }, { status: 400 });
  }

  const project = await prisma.rtkSurveyProject.create({
    data: {
      userId: session.id,
      name: body.name,
      ntripCaster: body.ntripCaster ?? session.ntrip.server,
      ntripMountpoint: body.ntripMountpoint ?? session.ntrip.mountpoint,
      status: body.adjustmentResult ? "ADJUSTED" : "DRAFT",
      adjustmentMethod: (body.adjustmentMethod as "TRANSLATION" | "HELMERT_2D" | "HELMERT_3D") ?? null,
      rmsBefore: body.adjustmentResult?.rmsBefore ?? null,
      rmsAfter: body.adjustmentResult?.rmsAfter ?? null,
      helmertParams: body.adjustmentResult?.params ? (body.adjustmentResult.params as object) : undefined,
      metadata: body.adjustmentResult ? ({ adjustmentResult: body.adjustmentResult } as object) : undefined,
      surveyPoints: {
        create: body.surveyPoints.map((p) => ({
          name: p.name, e: p.e, n: p.n, z: p.z,
          eCorr: p.eCorr ?? null, nCorr: p.nCorr ?? null, zCorr: p.zCorr ?? null,
        })),
      },
      controlPoints: body.controlPoints?.length
        ? {
            create: body.controlPoints.map((p) => ({
              name: p.name, eKnown: p.eKnown, nKnown: p.nKnown, zKnown: p.zKnown,
              eObserved: p.eObserved, nObserved: p.nObserved, zObserved: p.zObserved,
              residualE: p.residualE ?? null, residualN: p.residualN ?? null, residualZ: p.residualZ ?? null,
              rms: p.rms ?? null, isOutlier: p.isOutlier ?? false, excluded: p.excluded ?? false,
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json({ success: true, project });
}
