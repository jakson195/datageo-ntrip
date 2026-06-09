import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "v1:";

function getEncryptionKey(): Buffer {
  const secret =
    process.env.RTK_ENCRYPTION_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "dev-only-rtk-encryption-key";

  return scryptSync(secret, "rtk-credential-salt-v1", 32);
}

export function encryptRtkSecret(plaintext: string): string {
  if (!plaintext || plaintext === "NONE") return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptRtkSecret(stored: string): string {
  if (!stored || stored === "NONE") return stored;
  if (!stored.startsWith(PREFIX)) return stored;

  const payload = stored.slice(PREFIX.length);
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) return stored;

  const decipher = createDecipheriv(
    ALGO,
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/** Exibe os 4 primeiros caracteres + bullets: abcd•••••• */
export function maskRtkPassword(password: string): string {
  if (!password || password === "NONE") return "••••••••";
  const visible = password.slice(0, 4);
  const hiddenLength = Math.max(4, password.length - 4);
  return `${visible}${"•".repeat(hiddenLength)}`;
}

export function isEncryptedRtkSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}
