import { NextResponse } from "next/server";
import { planRepository } from "@/lib/db/repositories/plan.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await planRepository.findAllActive();
    return NextResponse.json({ ok: true, plans });
  } catch {
    return NextResponse.json({ error: "Falha ao listar planos." }, { status: 500 });
  }
}
