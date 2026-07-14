/** Chave pública MP (Checkout Bricks) — segura para expor ao browser. */
export function getMercadoPagoPublicKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ||
    process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ||
    null
  );
}
