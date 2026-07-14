import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { CadProject } from "@/lib/rtk-validation/cad/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROJECTS = 50;

function toRecord(row: {
  id: string;
  name: string;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const project = row.data as CadProject;
  return {
    id: row.id,
    name: row.name,
    savedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    project: { ...project, name: row.name },
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const rows = await prisma.cadUserProject.findMany({
    where: { userId: session.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_PROJECTS,
  });

  return NextResponse.json({ projects: rows.map(toRecord) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = (await request.json()) as { name?: string; project?: CadProject };
  const name = body.name?.trim() || body.project?.name?.trim() || "Projeto CAD";
  if (!body.project) {
    return NextResponse.json({ error: "Dados do projeto são obrigatórios." }, { status: 400 });
  }

  const count = await prisma.cadUserProject.count({ where: { userId: session.id } });
  if (count >= MAX_PROJECTS) {
    return NextResponse.json(
      { error: `Limite de ${MAX_PROJECTS} projetos salvos atingido. Exclua um projeto antigo.` },
      { status: 400 },
    );
  }

  const row = await prisma.cadUserProject.create({
    data: {
      userId: session.id,
      name,
      data: { ...body.project, name } as object,
    },
  });

  return NextResponse.json({ success: true, project: toRecord(row) });
}
