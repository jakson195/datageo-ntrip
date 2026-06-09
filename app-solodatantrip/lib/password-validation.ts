const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): { ok: true } | { ok: false; error: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, error: "E-mail inválido." };
  }
  return { ok: true };
}

export function validatePassword(
  password: string,
): { ok: true } | { ok: false; error: string } {
  if (!password || password.length < 8) {
    return { ok: false, error: "A senha deve ter no mínimo 8 caracteres." };
  }
  if (password.length > 128) {
    return { ok: false, error: "A senha deve ter no máximo 128 caracteres." };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      error: "A senha deve conter letras e números.",
    };
  }
  return { ok: true };
}

export function validateName(name: string): { ok: true } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Informe seu nome completo." };
  }
  if (trimmed.length > 120) {
    return { ok: false, error: "Nome muito longo." };
  }
  return { ok: true };
}
