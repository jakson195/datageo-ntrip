const applicationsSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Aplicações DataGeo NTRIP",
  description:
    "Correções GNSS RTK para agricultura de precisão, topografia, construção civil, geotecnia, mineração, monitoramento estrutural e hidrografia.",
  itemListElement: [
    "Agricultura de Precisão",
    "Topografia e Georreferenciamento",
    "Construção Civil",
    "Geotecnia e Sondagens",
    "Mineração",
    "Monitoramento Estrutural",
    "Hidrografia e Aplicações Marinhas",
  ].map((name, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name,
  })),
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DataGeo NTRIP",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Plataforma profissional de correções GNSS RTK e NTRIP para múltiplos segmentos: agricultura, topografia, obras, geotecnia, mineração e monitoramento.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
    description: "Trial grátis de 30 dias",
  },
};

export function LandingSeoJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}
