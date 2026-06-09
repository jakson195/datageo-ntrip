import { RtkSidebar } from "@/components/dashboard/rtk-sidebar";
import { RtkTopBar } from "@/components/dashboard/rtk-top-bar";
import type { SessionUser } from "@/lib/auth";

export function ClientAreaShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="client-shell flex min-h-screen flex-col">
      <RtkTopBar />
      <div className="flex flex-1 flex-col lg:flex-row">
        <RtkSidebar user={user} />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
      <a
        href="https://wa.me/5511999999999"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-2xl text-white shadow-lg transition hover:scale-105"
        aria-label="WhatsApp"
      >
        💬
      </a>
    </div>
  );
}
