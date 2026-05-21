"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

const navItems = [
  { href: "/area-cliente", label: "Painel", icon: "▦" },
  { href: "/area-cliente/credenciais", label: "Credenciais RTK", icon: "◎" },
  { href: "/area-cliente/uso", label: "Uso RTK", icon: "↗" },
  { href: "/area-cliente/pedidos", label: "Seus pedidos", icon: "☰" },
  { href: "/area-cliente/assinatura", label: "Comprar assinatura", icon: "＋" },
  { href: "/area-cliente/conta", label: "Detalhes da conta", icon: "👤" },
  { href: "/area-cliente/endereco", label: "Editar endereço", icon: "⌂" },
  { href: "/area-cliente/suporte", label: "Suporte", icon: "?" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/area-cliente") return pathname === "/area-cliente";
  return pathname.startsWith(href);
}

export function RtkSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="rtk-sidebar flex w-full shrink-0 flex-col text-white lg:w-[260px]">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-sm text-white/70">Olá</p>
        <p className="mt-1 truncate text-base font-semibold">{user.name}</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rtk-nav-item flex items-center gap-3 rounded-r-lg px-4 py-3 text-sm font-medium transition ${
                active ? "rtk-nav-active" : "text-white/80 hover:bg-white/5"
              }`}
            >
              <span className="text-base opacity-80" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={logout}
          className="rtk-nav-item flex w-full items-center gap-3 rounded-r-lg px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/5"
        >
          <span className="text-base opacity-80" aria-hidden>
            ⎋
          </span>
          Sair
        </button>
      </nav>
    </aside>
  );
}
