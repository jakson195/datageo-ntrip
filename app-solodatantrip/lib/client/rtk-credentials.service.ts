import "server-only";

import { revalidatePath } from "next/cache";
import { rtkLicenseRepository, userRepository } from "@/lib/db";
import { userDtoToDashboardSession } from "@/lib/users-store";

const RTK_USER_RE = /^[a-zA-Z0-9._-]{3,32}$/;

function validateRtkUsername(username: string): { ok: true } | { ok: false; error: string } {
  const trimmed = username.trim();
  if (!RTK_USER_RE.test(trimmed)) {
    return {
      ok: false,
      error: "Usuário RTK deve ter 3–32 caracteres (letras, números, . _ -).",
    };
  }
  return { ok: true };
}

function validateRtkPassword(password: string): { ok: true } | { ok: false; error: string } {
  if (!password || password.length < 6) {
    return { ok: false, error: "Senha RTK deve ter no mínimo 6 caracteres." };
  }
  if (password.length > 64) {
    return { ok: false, error: "Senha RTK deve ter no máximo 64 caracteres." };
  }
  return { ok: true };
}

export async function updateClientRtkCredentials(
  userId: string,
  input: { username?: string; password?: string },
): Promise<
  | { ok: true; session: ReturnType<typeof userDtoToDashboardSession> }
  | { ok: false; error: string }
> {
  const user = await userRepository.findById(userId);
  if (!user) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  if (!user.credentialsActive || user.ntrip.username === "NONE") {
    return {
      ok: false,
      error: "Credenciais RTK ainda não estão ativas. Aguarde a ativação da assinatura.",
    };
  }

  const username = input.username?.trim();
  const password = input.password?.trim();

  if (!username && !password) {
    return { ok: false, error: "Informe o novo usuário RTK e/ou a nova senha RTK." };
  }

  if (username) {
    const check = validateRtkUsername(username);
    if (!check.ok) return check;
  }

  if (password) {
    const check = validateRtkPassword(password);
    if (!check.ok) return check;
  }

  const ntripPatch: { username?: string; password?: string } = {};
  if (username) ntripPatch.username = username;
  if (password) ntripPatch.password = password;

  const updated = await userRepository.update(userId, { ntrip: ntripPatch });

  const primaryLicense = await rtkLicenseRepository.findPrimaryByUserId(userId);
  if (primaryLicense) {
    await rtkLicenseRepository.update(primaryLicense.id, {
      credentials: ntripPatch,
    });
  }

  revalidatePath("/area-cliente/credenciais");

  return {
    ok: true,
    session: userDtoToDashboardSession(updated),
  };
}
