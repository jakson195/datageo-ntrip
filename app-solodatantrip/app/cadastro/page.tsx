import { BrandLogo } from "@/components/brand-logo";
import { RegisterForm } from "@/components/register-form";
import { getDatabaseConfigStatus } from "@/lib/db/is-database-configured";

export const metadata = {
  title: "Cadastro | DataGeo NTrip",
  description: "Crie sua conta e acesse suas credenciais RTK.",
};

export default function CadastroPage() {
  const dbStatus = getDatabaseConfigStatus();

  return (
    <div className="auth-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <BrandLogo href="/" size="lg" variant="light" showWordmark className="justify-center" />
          </div>

          <div className="auth-card rounded-2xl p-8">
            <h1 className="text-center text-2xl font-bold text-[#0f172a]">Criar conta</h1>
            <p className="mt-2 text-center text-sm text-[#64748b]">
              Cadastre-se e receba credenciais NTRIP de trial automaticamente na área do
              cliente.
            </p>
            {!dbStatus.configured && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {dbStatus.friendlyError}
              </p>
            )}
            <div className="mt-8">
              <RegisterForm disabled={!dbStatus.configured} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
