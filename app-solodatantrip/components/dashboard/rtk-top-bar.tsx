import Link from "next/link";

export function RtkTopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold text-[#111827]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d6ecf] text-xs text-white">
          DG
        </span>
        <span>
          Datageo <span className="text-[#1d6ecf]">Ntrip</span>
        </span>
      </Link>
      <div className="hidden items-center gap-6 text-sm text-[#4b5563] md:flex">
        <Link href="/#ntrip" className="hover:text-[#1d6ecf]">
          Produto
        </Link>
        <Link href="/#setores" className="hover:text-[#1d6ecf]">
          Setores
        </Link>
        <Link href="/#planos" className="hover:text-[#1d6ecf]">
          Preços
        </Link>
        <Link href="/cobertura" className="hover:text-[#1d6ecf]">
          Cobertura
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/#contato"
          className="hidden rounded-lg border border-[#d1d5db] px-3 py-1.5 text-xs font-medium text-[#374151] sm:inline-block"
        >
          Agendar reunião
        </Link>
        <Link
          href="/#contato"
          className="rounded-lg bg-[#1d6ecf] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1558b0]"
        >
          Teste grátis
        </Link>
      </div>
    </header>
  );
}
