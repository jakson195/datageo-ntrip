"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavGroup = { title?: string; items: NavItem[] };

const navigation: NavGroup[] = [
  {
    items: [
      { href: "/area-cliente", label: "Página inicial" },
      { href: "/area-cliente/planos", label: "Planos" },
    ],
  },
  {
    title: "Serviço RTK",
    items: [
      { href: "/area-cliente/configuracao", label: "Configuração" },
      { href: "/area-cliente/cobertura", label: "Cobertura" },
      { href: "/area-cliente/rede", label: "Estado da rede" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/area-cliente") return pathname === "/area-cliente";
  return pathname.startsWith(href);
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-r border-[#e2e8f0] bg-white lg:w-64 lg:shrink-0">
      <div className="border-b border-[#e2e8f0] px-5 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[#0f172a]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm text-white">
            DG
          </span>
          <span>
            Datageo <span className="text-accent">Ntrip</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navigation.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? "bg-accent/15 text-accent"
                          : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#e2e8f0] px-4 py-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
          Links úteis
        </p>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs text-[#64748b] hover:border-accent"
          >
            Site
          </Link>
          <Link
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs text-[#64748b] hover:border-accent"
          >
            WhatsApp
          </Link>
        </div>
      </div>
    </aside>
  );
}
