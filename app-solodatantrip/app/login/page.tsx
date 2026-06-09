import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { HardNavLink } from "@/components/hard-nav-link";
import { LoginForm } from "@/components/login-form";
import { getDatabaseConfigStatus } from "@/lib/db/is-database-configured";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata = {
  title: "Login | DataGeo NTrip",
  description: "Área do cliente — credenciais NTRIP e assinatura.",
};

export default function LoginPage() {
  const dbStatus = getDatabaseConfigStatus();

  return (
    <div className="auth-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <BrandLogo href="/" size="lg" variant="light" showWordmark />
          </div>

          <div className="auth-card rounded-2xl p-8">
            <h1 className="text-center text-2xl font-bold text-[#0f172a]">Área do cliente</h1>
            <p className="mt-2 text-center text-sm text-[#64748b]">
              Acesse suas credenciais NTRIP e dados da assinatura.
            </p>
            {!dbStatus.configured && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {dbStatus.friendlyError}
              </p>
            )}
            <div className="mt-8">
              <Suspense fallback={<p className="text-center text-sm text-[#64748b]">Carregando…</p>}>
                <LoginForm />
              </Suspense>
            </div>
            <p className="mt-6 text-center text-sm text-[#64748b]">
              Não tem conta?{" "}
              <HardNavLink href="/cadastro" className="font-medium text-brand-geo hover:underline">
                Criar conta
              </HardNavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
