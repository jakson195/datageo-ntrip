import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "DataGeo NTRIP | Correções GNSS RTK para múltiplos segmentos",
  description:
    "Plataforma profissional de correções GNSS RTK e NTRIP para agricultura de precisão, topografia, construção civil, geotecnia, mineração, monitoramento estrutural e hidrografia. Trial grátis 30 dias.",
  keywords: [
    "NTRIP",
    "RTK",
    "GNSS",
    "correção RTK",
    "agricultura de precisão",
    "topografia",
    "construção civil",
    "geotecnia",
    "mineração",
    "monitoramento estrutural",
    "hidrografia",
    "DataGeo NTRIP",
  ],
  openGraph: {
    title: "DataGeo NTRIP | Correções GNSS RTK profissionais",
    description:
      "Correções GNSS RTK em tempo real para agricultura, topografia, obras, geotecnia, mineração e monitoramento. Auditoria RTK, validação PPP e relatórios automáticos.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function Home() {
  return <LandingPage />;
}
