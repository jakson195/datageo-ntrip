"use client";

import { useState } from "react";
import type { NtripCredentials } from "@/lib/auth";
import { CopyField } from "./copy-field";

export function NtripCredentialsCard({ ntrip }: { ntrip: NtripCredentials }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="rounded-2xl border-2 border-accent/40 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-lg">
            🔑
          </span>
          <div>
            <h2 className="text-xl font-bold text-[#0f172a]">Suas credenciais NTRIP</h2>
            <p className="text-sm text-[#64748b]">
              Use estes dados no seu controlador DJI, Emlid ou outro receptor GNSS.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          Para o equipamento
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CopyField label="Servidor" value={ntrip.server} />
        <CopyField label="Porta" value={ntrip.port} />
        <CopyField label="Ponto de montagem" value={ntrip.mountpoint} />
        <CopyField label="Usuário NTRIP" value={ntrip.username} />
        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
            Senha NTRIP
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 font-mono text-sm font-medium text-[#0f172a]">
              {showPassword ? ntrip.password : "••••••••••••"}
            </p>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-lg border border-[#d1d9e6] bg-white px-2.5 py-1.5 text-xs text-[#475569] hover:border-accent"
                title={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
              <CopyButton value={ntrip.password} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-lg border border-[#d1d9e6] bg-white px-2.5 py-1.5 text-xs font-medium text-[#475569] hover:border-accent hover:text-accent"
    >
      {copied ? "✓" : "Copiar"}
    </button>
  );
}
