"use client";

import type { SessionUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

export function DashboardHeader({
  user,
  title,
  subtitle,
}: {
  user: SessionUser;
  title: string;
  subtitle: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e2e8f0] bg-white px-4 py-5 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">{title}</h1>
        <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={logout}
          className="hidden rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs font-medium text-[#64748b] hover:border-red-300 hover:text-red-600 sm:inline-block"
        >
          Sair
        </button>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white"
          title={user.name}
        >
          {user.initials}
        </div>
      </div>
    </header>
  );
}
