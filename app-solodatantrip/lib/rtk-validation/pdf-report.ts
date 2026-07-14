import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AdjustmentParams, AdjustmentResult } from "./types";

export interface ReportInput {
  user: { name: string; email: string };
  projectName: string;
  ntripCaster?: string;
  ntripMountpoint?: string;
  crs?: string;
  result: AdjustmentResult;
}

const BRAND_PRIMARY: [number, number, number] = [15, 40, 72];
const BRAND_ACCENT: [number, number, number] = [0, 200, 240];
const LOGO_PATH = "/brand/datageo-ntrip-logo-h.png";
const MARGIN = 14;

type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };

async function loadLogoDataUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(LOGO_PATH);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function methodLabel(method: AdjustmentParams["method"]) {
  switch (method) {
    case "TRANSLATION":
      return "Translação simples (ΔE, ΔN, ΔZ)";
    case "HELMERT_2D":
      return "Helmert 2D (translação, rotação, escala)";
    case "HELMERT_3D":
      return "Helmert 3D (translação, rotação 3D, escala)";
    default:
      return method;
  }
}

function adjustmentParamsLines(params: AdjustmentParams): string[] {
  if (params.method === "TRANSLATION") {
    return [
      `ΔE = ${params.deltaE.toFixed(4)} m`,
      `ΔN = ${params.deltaN.toFixed(4)} m`,
      `ΔZ = ${params.deltaZ.toFixed(4)} m`,
    ];
  }
  if (params.method === "HELMERT_2D") {
    return [
      `tx = ${params.tx.toFixed(4)} m`,
      `ty = ${params.ty.toFixed(4)} m`,
      `Rotação = ${((params.rotationRad * 180) / Math.PI).toFixed(6)}°`,
      `Escala = ${params.scale.toFixed(8)}`,
    ];
  }
  return [
    `tx = ${params.tx.toFixed(4)} m`,
    `ty = ${params.ty.toFixed(4)} m`,
    `tz = ${params.tz.toFixed(4)} m`,
    `rx = ${params.rx.toFixed(6)} rad`,
    `ry = ${params.ry.toFixed(6)} rad`,
    `rz = ${params.rz.toFixed(6)} rad`,
    `Escala = ${params.scale.toFixed(8)}`,
  ];
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFillColor(...BRAND_ACCENT);
  doc.rect(MARGIN, y - 4, 3, 6, "F");
  doc.setTextColor(...BRAND_PRIMARY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(text, MARGIN + 6, y);
}

function tableEndY(doc: AutoTableDoc) {
  return (doc.lastAutoTable?.finalY ?? MARGIN) + 8;
}

function drawHeader(doc: jsPDF, pageW: number, logo: string | null) {
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 0, pageW, 28, "F");
  if (logo) {
    doc.addImage(logo, "PNG", MARGIN, 6, 54, 16);
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Datageo NTRIP", MARGIN, 16);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Técnico — Validação RTK", pageW - MARGIN, 12, { align: "right" });
  doc.text("Validação e Ajustamento Geodésico", pageW - MARGIN, 18, { align: "right" });
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number, pageNum: number, totalPages: number) {
  doc.setDrawColor(210, 210, 210);
  doc.line(MARGIN, pageH - 12, pageW - MARGIN, pageH - 12);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Datageo NTRIP — Relatório gerado automaticamente © ${new Date().getFullYear()}`, MARGIN, pageH - 6);
  doc.text(`Página ${pageNum} de ${totalPages}`, pageW - MARGIN, pageH - 6, { align: "right" });
}

export async function generateRtkReportPdf(input: ReportInput) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as AutoTableDoc;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = await loadLogoDataUrl();
  const now = new Date().toLocaleString("pt-BR");
  const activeControls = input.result.controlPoints.filter((p) => !p.excluded);

  const pageHeader = () => drawHeader(doc, pageW, logo);

  pageHeader();
  let y = 36;

  doc.setTextColor(...BRAND_PRIMARY);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Técnico de Validação RTK", MARGIN, y);
  y += 9;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: MARGIN, right: MARGIN },
    body: [
      ["Data de emissão", now, "Usuário", input.user.name],
      ["Projeto", input.projectName, "E-mail", input.user.email],
      ["Base NTRIP", input.ntripCaster ?? "—", "Mountpoint", input.ntripMountpoint ?? "—"],
      ["Sistema de coordenadas", input.crs ?? "EPSG:4674", "Método de ajuste", methodLabel(input.result.params.method)],
      ["Pontos de controle", String(activeControls.length), "Pontos do levantamento", String(input.result.surveyPoints.length)],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, textColor: [30, 30, 30] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 36, textColor: BRAND_PRIMARY },
      2: { fontStyle: "bold", cellWidth: 36, textColor: BRAND_PRIMARY },
    },
  });

  y = tableEndY(doc);
  sectionTitle(doc, "Parâmetros do ajustamento", y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  for (const line of adjustmentParamsLines(input.result.params)) {
    doc.text(`• ${line}`, MARGIN + 2, y);
    y += 5;
  }
  y += 4;

  sectionTitle(doc, "Indicadores globais de precisão", y);
  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Indicador", "Antes do ajuste", "Após o ajuste", "Melhoria"]],
    body: [
      [
        "RMS 3D",
        `${input.result.rmsBefore.toFixed(4)} m`,
        `${input.result.rmsAfter.toFixed(4)} m`,
        `${(input.result.rmsBefore - input.result.rmsAfter).toFixed(4)} m`,
      ],
      [
        "Precisão horizontal (RMS)",
        `${input.result.rmsHorizBefore.toFixed(4)} m`,
        `${input.result.rmsHorizAfter.toFixed(4)} m`,
        `${(input.result.rmsHorizBefore - input.result.rmsHorizAfter).toFixed(4)} m`,
      ],
      [
        "Precisão vertical (RMS)",
        `${input.result.rmsVertBefore.toFixed(4)} m`,
        `${input.result.rmsVertAfter.toFixed(4)} m`,
        `${(input.result.rmsVertBefore - input.result.rmsVertAfter).toFixed(4)} m`,
      ],
    ],
    styles: { fontSize: 9, textColor: [30, 30, 30] },
    headStyles: { fillColor: BRAND_PRIMARY, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 249, 255] },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) pageHeader();
    },
  });

  y = tableEndY(doc);
  sectionTitle(doc, "Precisão por ponto de controle", y);
  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      [
        "ID",
        "DESC",
        "E con.",
        "N con.",
        "Z con.",
        "E obs.",
        "N obs.",
        "Z obs.",
        "ΔE",
        "ΔN",
        "ΔZ",
        "Erro H",
        "Erro V",
        "RMS",
        "Res. E",
        "Res. N",
        "Res. Z",
        "Outlier",
      ],
    ],
    body: activeControls.map((p) => [
      p.observedCode || p.name,
      p.observedDescription || "—",
      p.eKnown.toFixed(3),
      p.nKnown.toFixed(3),
      p.zKnown.toFixed(3),
      p.eObserved.toFixed(3),
      p.nObserved.toFixed(3),
      p.zObserved.toFixed(3),
      p.deltaE.toFixed(4),
      p.deltaN.toFixed(4),
      p.deltaZ.toFixed(4),
      p.horizError.toFixed(4),
      p.vertError.toFixed(4),
      (p.rms ?? 0).toFixed(4),
      (p.residualE ?? 0).toFixed(4),
      (p.residualN ?? 0).toFixed(4),
      (p.residualZ ?? 0).toFixed(4),
      p.isOutlier ? "Sim (3σ)" : "Não",
    ]),
    styles: { fontSize: 6.2, overflow: "linebreak", textColor: [30, 30, 30] },
    headStyles: { fillColor: BRAND_PRIMARY, textColor: [255, 255, 255], fontSize: 6.2 },
    alternateRowStyles: { fillColor: [245, 249, 255] },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) pageHeader();
    },
  });

  y = tableEndY(doc);
  sectionTitle(doc, "Pontos do levantamento — coordenadas ajustadas", y);
  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      [
        "ID",
        "DESC",
        "E original",
        "N original",
        "Z original",
        "E ajustado",
        "N ajustado",
        "Z ajustado",
        "ΔE",
        "ΔN",
        "ΔZ",
        "RMS desloc.",
      ],
    ],
    body: input.result.surveyPoints.map((p) => {
      const eCorr = p.eCorr ?? p.e;
      const nCorr = p.nCorr ?? p.n;
      const zCorr = p.zCorr ?? p.z;
      const dE = eCorr - p.e;
      const dN = nCorr - p.n;
      const dZ = zCorr - p.z;
      const rms = Math.sqrt((dE ** 2 + dN ** 2 + dZ ** 2) / 3);
      return [
        p.code || p.name,
        p.description || "—",
        p.e.toFixed(3),
        p.n.toFixed(3),
        p.z.toFixed(3),
        eCorr.toFixed(3),
        nCorr.toFixed(3),
        zCorr.toFixed(3),
        dE.toFixed(4),
        dN.toFixed(4),
        dZ.toFixed(4),
        rms.toFixed(4),
      ];
    }),
    styles: { fontSize: 7, textColor: [30, 30, 30] },
    headStyles: { fillColor: BRAND_PRIMARY, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 249, 255] },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) pageHeader();
    },
  });

  y = tableEndY(doc);
  if (y < pageH - 40) {
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Nota: Erro H = √(ΔE² + ΔN²); Erro V = |ΔZ|; RMS por ponto calculado a partir dos resíduos após ajustamento. Outliers identificados pelo critério 3σ.",
      MARGIN,
      y,
      { maxWidth: pageW - MARGIN * 2 },
    );
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageW, pageH, i, totalPages);
  }

  return doc;
}

export async function downloadRtkReportPdf(input: ReportInput, filename: string) {
  const doc = await generateRtkReportPdf(input);
  doc.save(filename);
}
