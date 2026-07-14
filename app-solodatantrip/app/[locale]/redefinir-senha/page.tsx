import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = {
  title: "Redefinir senha | DataGeo NTrip",
  description: "Crie uma nova senha para sua conta.",
};

export default function RedefinirSenhaPage() {
  return (
    <div className="auth-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <BrandLogo href="/" size="lg" variant="light" showWordmark />
          </div>

          <div className="auth-card rounded-2xl p-8">
            <h1 className="text-center text-2xl font-bold text-[#0f172a]">Nova senha</h1>
            <p className="mt-2 text-center text-sm text-[#64748b]">
              Defina uma nova senha para acessar a área do cliente.
            </p>
            <div className="mt-8">
              <Suspense fallback={<p className="text-center text-sm text-[#64748b]">Carregando…</p>}>
                <ResetPasswordForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
