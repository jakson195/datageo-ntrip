"use client";

import { useState } from "react";

export function CopyField({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p
          className={`min-w-0 flex-1 truncate text-sm font-medium text-[#0f172a] ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
        <button
          type="button"
          onClick={copy}
          title="Copiar"
          className="shrink-0 rounded-lg border border-[#d1d9e6] bg-white px-2.5 py-1.5 text-xs font-medium text-[#475569] transition hover:border-brand-geo hover:text-brand-geo"
        >
          {copied ? "✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
