import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runAdjustment } from "@/lib/rtk-validation/adjustment";
import type { ControlPointInput, SurveyPoint } from "@/lib/rtk-validation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = (await request.json()) as {
    surveyPoints?: SurveyPoint[];
    controlPoints?: ControlPointInput[];
    method?: "TRANSLATION" | "HELMERT_2D" | "HELMERT_3D";
  };

  if (!body.surveyPoints?.length || !body.controlPoints?.length) {
    return NextResponse.json({ error: "Pontos obrigatórios." }, { status: 400 });
  }

  return NextResponse.json({ success: true, result: runAdjustment(body.surveyPoints, body.controlPoints, body.method ?? "TRANSLATION") });
}
