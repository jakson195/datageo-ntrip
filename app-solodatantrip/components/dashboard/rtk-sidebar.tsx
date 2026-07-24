"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { SessionUser } from "@/lib/auth";

const navKeys = [
  { href: "/area-cliente" as const, key: "panel" },
  { href: "/area-cliente/credenciais" as const, key: "credentials" },
  { href: "/area-cliente/validacao-rtk" as const, key: "rtkValidation" },
  { href: "/area-cliente/cad" as const, key: "cadEnvironment" },
  { href: "/area-cliente/uso" as const, key: "usage" },
  { href: "/area-cliente/pedidos" as const, key: "orders" },
  { href: "/area-cliente/assinatura" as const, key: "subscription" },
  { href: "/area-cliente/conta" as const, key: "account" },
  { href: "/area-cliente/endereco" as const, key: "address" },
  { href: "/area-cliente/suporte" as const, key: "support" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/area-cliente") return pathname === "/area-cliente";
  return pathname.startsWith(href);
}

export function RtkSidebar({ user }: { user: SessionUser }) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="rtk-sidebar flex w-full shrink-0 flex-col text-white lg:w-[260px]">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-sm text-white/70">{t("hello")}</p>
        <p className="mt-1 truncate text-base font-semibold">{user.name}</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {navKeys.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rtk-nav-item flex items-center gap-3 rounded-r-lg px-4 py-3.5 text-base font-medium transition ${
                active ? "rtk-nav-active" : "text-white/80 hover:bg-white/5"
              }`}
            >
              <span className="text-base opacity-80" aria-hidden>
                ◎
              </span>
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={logout}
          className="rtk-nav-item flex w-full items-center gap-3 rounded-r-lg px-4 py-3.5 text-left text-base font-medium text-white/80 transition hover:bg-white/5"
        >
          <span className="text-base opacity-80" aria-hidden>
            ⎋
          </span>
          {t("logout")}
        </button>
      </nav>
    </aside>
  );
}
