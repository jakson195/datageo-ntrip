import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = {
  title: "Recuperar senha | DataGeo NTrip",
  description: "Recupere o acesso à sua conta na área do cliente.",
};

export default function RecuperarSenhaPage() {
  return (
    <div className="auth-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <BrandLogo href="/" size="lg" variant="light" showWordmark />
          </div>

          <div className="auth-card rounded-2xl p-8">
            <h1 className="text-center text-2xl font-bold text-[#0f172a]">Recuperar senha</h1>
            <p className="mt-2 text-center text-sm text-[#64748b]">
              Área do cliente — redefina a senha de acesso à sua conta.
            </p>
            <div className="mt-8">
              <Suspense fallback={<p className="text-center text-sm text-[#64748b]">Carregando…</p>}>
                <ForgotPasswordForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
