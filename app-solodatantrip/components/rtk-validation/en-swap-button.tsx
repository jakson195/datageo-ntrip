"use client";

export function EnSwapButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1 rounded-md border border-[#d1d5db] bg-white px-2 py-1 text-xs font-medium text-[#111827] shadow-sm transition hover:border-[#00c8f0] hover:bg-[#f0fdff] ${className}`}
    >
      <span aria-hidden>⇄</span>
      <span>E ↔ N</span>
    </button>
  );
}
