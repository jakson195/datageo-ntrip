"use client";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/login");
      }}
      className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-medium text-[#64748b] hover:border-red-300 hover:text-red-600 lg:hidden"
    >
      Sair da conta
    </button>
  );
}
