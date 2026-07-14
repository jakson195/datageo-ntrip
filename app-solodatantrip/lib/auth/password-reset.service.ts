import "server-only";

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { hashPassword } from "@/lib/password";
import { validateEmail, validatePassword } from "@/lib/password-validation";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

async function sendResetEmail(email: string, name: string, resetUrl: string) {
  const subject = "DataGeo NTRIP — recuperação de senha";
  const body = `Olá ${name},\n\nRecebemos um pedido para redefinir a senha da sua conta.\n\nAcesse o link abaixo (válido por 1 hora):\n${resetUrl}\n\nSe você não solicitou, ignore este e-mail.\n\nEquipe DataGeo NTRIP`;

  const webhook = process.env.BILLING_NOTIFICATION_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject, body }),
      });
      return;
    } catch (error) {
      console.error("[password-reset-email]", error);
    }
  }

  console.log(
    JSON.stringify({
      service: "password-reset",
      to: email,
      resetUrl,
      preview: body.slice(0, 160),
    }),
  );
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return emailCheck;

  const user = await userRepository.findByEmail(email.trim().toLowerCase());
  if (!user) {
    return { ok: true };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${appBaseUrl()}/redefinir-senha?token=${rawToken}`;
  await sendResetEmail(user.email, user.name, resetUrl);

  return { ok: true };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) return passwordCheck;

  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, error: "Link de recuperação inválido." };
  }

  const tokenHash = hashToken(trimmed);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    return { ok: false, error: "Link expirado ou inválido. Solicite uma nova recuperação." };
  }

  await userRepository.update(record.userId, {
    passwordHash: await hashPassword(newPassword),
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { ok: true };
}

export async function changeAccountPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) return passwordCheck;

  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  const { verifyPassword } = await import("@/lib/password");
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  await userRepository.update(userId, {
    passwordHash: await hashPassword(newPassword),
  });

  return { ok: true };
}
