import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveBody = {
  name?: string;
  ntripCaster?: string;
  ntripMountpoint?: string;
  adjustmentMethod?: string;
  surveyPoints?: Array<{ name: string; e: number; n: number; z: number; eCorr?: number; nCorr?: number; zCorr?: number }>;
  controlPoints?: Array<{
    name: string;
    eKnown: number;
    nKnown: number;
    zKnown: number;
    eObserved: number;
    nObserved: number;
    zObserved: number;
    excluded?: boolean;
    residualE?: number;
    residualN?: number;
    residualZ?: number;
    isOutlier?: boolean;
    rms?: number;
  }>;
  adjustmentResult?: { rmsBefore?: number; rmsAfter?: number; params?: unknown };
};

async function findOwnedProject(id: string, userId: string) {
  return prisma.rtkSurveyProject.findFirst({
    where: { id, userId },
    include: {
      surveyPoints: true,
      controlPoints: true,
      _count: { select: { surveyPoints: true, controlPoints: true } },
    },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await context.params;
  const project = await findOwnedProject(id, session.id);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

  return NextResponse.json({ project });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.rtkSurveyProject.findFirst({ where: { id, userId: session.id } });
  if (!existing) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

  const body = (await request.json()) as SaveBody;
  if (!body.name || !body.surveyPoints?.length) {
    return NextResponse.json({ error: "Nome e pontos são obrigatórios." }, { status: 400 });
  }

  const project = await prisma.$transaction(async (tx) => {
    await tx.rtkSurveyPoint.deleteMany({ where: { projectId: id } });
    await tx.rtkControlPoint.deleteMany({ where: { projectId: id } });

    return tx.rtkSurveyProject.update({
      where: { id },
      data: {
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
          create: body.surveyPoints!.map((p) => ({
            name: p.name,
            e: p.e,
            n: p.n,
            z: p.z,
            eCorr: p.eCorr ?? null,
            nCorr: p.nCorr ?? null,
            zCorr: p.zCorr ?? null,
          })),
        },
        controlPoints: body.controlPoints?.length
          ? {
              create: body.controlPoints.map((p) => ({
                name: p.name,
                eKnown: p.eKnown,
                nKnown: p.nKnown,
                zKnown: p.zKnown,
                eObserved: p.eObserved,
                nObserved: p.nObserved,
                zObserved: p.zObserved,
                residualE: p.residualE ?? null,
                residualN: p.residualN ?? null,
                residualZ: p.residualZ ?? null,
                rms: p.rms ?? null,
                isOutlier: p.isOutlier ?? false,
                excluded: p.excluded ?? false,
              })),
            }
          : undefined,
      },
      include: { _count: { select: { surveyPoints: true, controlPoints: true } } },
    });
  });

  return NextResponse.json({ success: true, project });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.rtkSurveyProject.findFirst({ where: { id, userId: session.id } });
  if (!existing) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

  await prisma.rtkSurveyProject.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
