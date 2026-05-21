"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-medium text-[#64748b] hover:border-red-300 hover:text-red-600 lg:hidden"
    >
      Sair da conta
    </button>
  );
}
