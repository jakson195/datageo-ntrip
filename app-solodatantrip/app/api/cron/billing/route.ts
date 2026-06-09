import { NextResponse } from "next/server";
import { billingAutomationService } from "@/lib/billing/billing-automation.service";
import { runRtkExpirationJob } from "@/lib/rtk/expiration-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const [overdue, reminders, expiration] = await Promise.all([
      billingAutomationService.processOverdueSubscriptions(),
      billingAutomationService.sendDueReminders(),
      runRtkExpirationJob(),
    ]);

    return NextResponse.json({
      ok: true,
      overdue,
      remindersSent: reminders,
      expiration,
    });
  } catch {
    return NextResponse.json({ error: "Falha no job de billing." }, { status: 500 });
  }
}
