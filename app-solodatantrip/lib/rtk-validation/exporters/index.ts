import type { SurveyPoint } from "../types";

function coords(pt: SurveyPoint) {
  return { e: pt.eCorr ?? pt.e, n: pt.nCorr ?? pt.n, z: pt.zCorr ?? pt.z };
}

export function exportCsv(points: SurveyPoint[]) {
  const header = "ID,DESC,E,N,Z,E_orig,N_orig,Z_orig";
  const rows = points.map((pt) => {
    const c = coords(pt);
    return [
      pt.code ?? pt.name,
      pt.description ?? pt.name,
      c.e.toFixed(4),
      c.n.toFixed(4),
      c.z.toFixed(4),
      pt.e.toFixed(4),
      pt.n.toFixed(4),
      pt.z.toFixed(4),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function exportGeoJson(points: SurveyPoint[]) {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      features: points.map((pt) => {
        const c = coords(pt);
        return {
          type: "Feature",
          properties: { name: pt.name, e_orig: pt.e, n_orig: pt.n, z_orig: pt.z },
          geometry: { type: "Point", coordinates: [c.e, c.n, c.z] },
        };
      }),
    },
    null,
    2,
  );
}

export function exportDxf(points: SurveyPoint[]) {
  const lines = ["0", "SECTION", "2", "HEADER", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"];
  for (const pt of points) {
    const c = coords(pt);
    lines.push("0", "POINT", "8", "RTK_CORR", "10", String(c.e), "20", String(c.n), "30", String(c.z), "1", pt.name);
  }
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

export function downloadText(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
