"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { SessionUser } from "@/lib/auth";
import { useRouter } from "@/i18n/navigation";
import {
  computeSingleControlStats,
  computeGlobalRms,
  computeIndividualRms,
  detectOutliers3Sigma,
  runAdjustment,
  parseSurveyFile,
  exportCsv,
  exportDxf,
  exportGeoJson,
  downloadText,
  downloadRtkReportPdf,
  swapAllSurveyPointsEn,
  swapControlAllEn,
} from "@/lib/rtk-validation";
import { saveCadImportPayload, exportSurveyPointsOds, formatSavedDate } from "@/lib/rtk-validation/cad";
import { downloadOdsBlob } from "@/lib/rtk-validation/ods-writer";
import type { AdjustmentResult, ControlPointInput, ControlPointWithStats, QualityDailyRecord, SurveyPoint } from "@/lib/rtk-validation/types";
import { PointsMap } from "./points-map";
import { QualityDashboard } from "./quality-dashboard";
import { ControlPointCard } from "./control-point-card";
import { EnSwapButton } from "./en-swap-button";

type TabId = "import" | "control" | "adjust" | "export" | "quality";

function newId() {
  return `cp_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyControl(name = "1"): ControlPointInput {
  return {
    id: newId(),
    name,
    source: "manual",
    eKnown: 0,
    nKnown: 0,
    zKnown: 0,
    eObserved: 0,
    nObserved: 0,
    zObserved: 0,
    excluded: false,
  };
}

export function RtkValidationWorkspace({ user }: { user: SessionUser }) {
  const t = useTranslations("rtkValidation");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<TabId>("import");
  const [projectName, setProjectName] = useState("Levantamento RTK");
  const [surveyPoints, setSurveyPoints] = useState<SurveyPoint[]>([]);
  const [controlPoints, setControlPoints] = useState<ControlPointInput[]>([emptyControl()]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [adjustmentResult, setAdjustmentResult] = useState<AdjustmentResult | null>(null);
  const [method, setMethod] = useState<"TRANSLATION" | "HELMERT_2D" | "HELMERT_3D">("TRANSLATION");
  const [qualityRecords, setQualityRecords] = useState<QualityDailyRecord[]>([]);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<
    Array<{ id: string; name: string; updatedAt: string; _count: { surveyPoints: number; controlPoints: number } }>
  >([]);
  const [openProjectsPanel, setOpenProjectsPanel] = useState(false);
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [coordinatesGeoreferenced, setCoordinatesGeoreferenced] = useState(false);

  const controlWithStats: ControlPointWithStats[] = useMemo(() => {
    const base = controlPoints.map((cp) => ({
      ...cp,
      ...computeSingleControlStats(
        { e: cp.eKnown, n: cp.nKnown, z: cp.zKnown },
        { e: cp.eObserved, n: cp.nObserved, z: cp.zObserved },
      ),
      residualE: adjustmentResult?.controlPoints.find((p) => p.id === cp.id)?.residualE,
      residualN: adjustmentResult?.controlPoints.find((p) => p.id === cp.id)?.residualN,
      residualZ: adjustmentResult?.controlPoints.find((p) => p.id === cp.id)?.residualZ,
      isOutlier: adjustmentResult?.controlPoints.find((p) => p.id === cp.id)?.isOutlier,
    }));
    return computeIndividualRms(base);
  }, [controlPoints, adjustmentResult]);

  const globalRms = useMemo(() => computeGlobalRms(controlWithStats), [controlWithStats]);
  const displayPoints = adjustmentResult?.surveyPoints ?? surveyPoints;
  const displayControls = adjustmentResult?.controlPoints ?? controlWithStats;

  const handleFile = useCallback(async (file: File) => {
    const result = parseSurveyFile(file.name, await file.text());
    setSurveyPoints(result.points);
    setParseWarnings(result.warnings);
    setAdjustmentResult(null);
    setCoordinatesGeoreferenced(false);
    if (result.points.length > 0) setTab("control");
  }, []);

  useEffect(() => {
    setControlPoints((prev) =>
      prev.map((cp) => {
        if (cp.source !== "imported" || !cp.linkedSurveyPointId) return cp;
        const pt = surveyPoints.find((p) => p.id === cp.linkedSurveyPointId);
        if (!pt) return cp;
        return {
          ...cp,
          observedCode: pt.code?.trim() || pt.name,
          observedDescription: pt.description?.trim() || "",
          eObserved: pt.e,
          nObserved: pt.n,
          zObserved: pt.z,
        };
      }),
    );
  }, [surveyPoints]);

  const runAdjust = () => {
    const result = runAdjustment(surveyPoints, controlPoints, method);
    const outlier = detectOutliers3Sigma(result.controlPoints);
    setAdjustmentResult({ ...result, controlPoints: outlier.updatedPoints });
    setTab("export");
  };

  const patchControl = (id: string, patch: Partial<ControlPointInput>) => {
    setControlPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const applyEnGeoreference = () => {
    setSurveyPoints((prev) => swapAllSurveyPointsEn(prev));
    setControlPoints((prev) => prev.map(swapControlAllEn));
    setCoordinatesGeoreferenced(true);
    setAdjustmentResult(null);
  };

  const toggleExclude = (id: string) => {
    setControlPoints((prev) => prev.map((p) => (p.id === id ? { ...p, excluded: !p.excluded } : p)));
  };

  const removeControl = (id: string) => {
    setControlPoints((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  };

  const addControlPoint = () => {
    setControlPoints((prev) => [...prev, emptyControl(String(prev.length + 1))]);
  };

  const exportPdf = async () => {
    if (!adjustmentResult) return;
    setExportingPdf(true);
    try {
      await downloadRtkReportPdf(
        {
          user: { name: user.name, email: user.email },
          projectName,
          ntripCaster: user.ntrip.server,
          ntripMountpoint: user.ntrip.mountpoint,
          result: adjustmentResult,
        },
        `${projectName}_relatorio_tecnico.pdf`,
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const loadQuality = useCallback(async () => {
    setQualityLoading(true);
    try {
      const res = await fetch("/api/rtk-validation/quality");
      if (res.ok) setQualityRecords(((await res.json()) as { records: QualityDailyRecord[] }).records ?? []);
    } finally {
      setQualityLoading(false);
    }
  }, []);

  const openCadEnvironment = () => {
    saveCadImportPayload({
      projectName,
      surveyPoints,
      controlPoints: displayControls,
      adjustmentResult,
    });
    router.push("/area-cliente/cad");
  };

  const loadSavedProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/rtk-validation/projects");
      if (!res.ok) return;
      const data = (await res.json()) as {
        projects: Array<{
          id: string;
          name: string;
          updatedAt: string;
          _count: { surveyPoints: number; controlPoints: number };
        }>;
      };
      setSavedProjects(data.projects ?? []);
    } catch {
      setSavedProjects([]);
    }
  }, []);

  useEffect(() => {
    void loadSavedProjects();
  }, [loadSavedProjects]);

  useEffect(() => {
    if (!projectNotice) return;
    const timer = window.setTimeout(() => setProjectNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [projectNotice]);

  const saveProject = async () => {
    setSaving(true);
    try {
      const payload = {
        name: projectName,
        ntripCaster: user.ntrip.server,
        ntripMountpoint: user.ntrip.mountpoint,
        adjustmentMethod: method,
        surveyPoints,
        controlPoints,
        adjustmentResult,
      };
      const res = await fetch(
        savedProjectId ? `/api/rtk-validation/projects/${savedProjectId}` : "/api/rtk-validation/projects",
        {
          method: savedProjectId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        setProjectNotice(t("saveFailed"));
        return;
      }
      const data = (await res.json()) as { project: { id: string } };
      setSavedProjectId(data.project.id);
      setProjectNotice(t("savedSuccess"));
      await loadSavedProjects();
    } catch {
      setProjectNotice(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openSavedProject = async (id: string) => {
    try {
      const res = await fetch(`/api/rtk-validation/projects/${id}`);
      if (!res.ok) {
        setProjectNotice(t("projects.openFailed"));
        return;
      }
      const data = (await res.json()) as {
        project: {
          id: string;
          name: string;
          adjustmentMethod: "TRANSLATION" | "HELMERT_2D" | "HELMERT_3D" | null;
          metadata: { adjustmentResult?: AdjustmentResult } | null;
          surveyPoints: Array<{ name: string; e: number; n: number; z: number; eCorr?: number | null; nCorr?: number | null; zCorr?: number | null }>;
          controlPoints: Array<{
            name: string;
            eKnown: number;
            nKnown: number;
            zKnown: number;
            eObserved: number;
            nObserved: number;
            zObserved: number;
            excluded: boolean;
            residualE?: number | null;
            residualN?: number | null;
            residualZ?: number | null;
            isOutlier?: boolean;
          }>;
        };
      };

      const p = data.project;
      setSavedProjectId(p.id);
      setProjectName(p.name);
      setSurveyPoints(
        p.surveyPoints.map((pt) => ({
          id: newId(),
          name: pt.name,
          e: pt.e,
          n: pt.n,
          z: pt.z,
          eCorr: pt.eCorr ?? undefined,
          nCorr: pt.nCorr ?? undefined,
          zCorr: pt.zCorr ?? undefined,
        })),
      );
      setControlPoints(
        p.controlPoints.length
          ? p.controlPoints.map((cp) => ({
              id: newId(),
              name: cp.name,
              source: "manual" as const,
              eKnown: cp.eKnown,
              nKnown: cp.nKnown,
              zKnown: cp.zKnown,
              eObserved: cp.eObserved,
              nObserved: cp.nObserved,
              zObserved: cp.zObserved,
              excluded: cp.excluded,
            }))
          : [emptyControl()],
      );
      setMethod(p.adjustmentMethod ?? "TRANSLATION");
      setAdjustmentResult(p.metadata?.adjustmentResult ?? null);
      setParseWarnings([]);
      setCoordinatesGeoreferenced(false);
      setOpenProjectsPanel(false);
      setProjectNotice(t("projects.opened", { name: p.name }));
      setTab(p.surveyPoints.length > 0 ? "control" : "import");
    } catch {
      setProjectNotice(t("projects.openFailed"));
    }
  };

  const deleteSavedProject = async (id: string, name: string) => {
    if (!window.confirm(t("projects.confirmDelete", { name }))) return;
    try {
      const res = await fetch(`/api/rtk-validation/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setProjectNotice(t("projects.deleteFailed"));
        return;
      }
      if (savedProjectId === id) setSavedProjectId(null);
      await loadSavedProjects();
      setProjectNotice(t("projects.deleted"));
    } catch {
      setProjectNotice(t("projects.deleteFailed"));
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "import", label: t("tabs.import") },
    { id: "control", label: t("tabs.control") },
    { id: "adjust", label: t("tabs.adjust") },
    { id: "export", label: t("tabs.export") },
    { id: "quality", label: t("tabs.quality") },
  ];

  return (
    <div className="rtk-validation-workspace space-y-4 text-[#111827]">
      <div className="flex flex-col gap-4 rounded-xl border border-[#e5e7eb] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="text-xs font-medium text-[#6b7280]">{t("projectName")}</label>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="mt-1 block w-full min-w-[200px] rounded-lg border border-[#d1d5db] px-3 py-2 text-sm font-semibold text-[#0f2848]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveProject} disabled={saving || surveyPoints.length === 0} className="rounded-lg bg-[#0f2848] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? t("saving") : t("saveProject")}
          </button>
          <button
            type="button"
            onClick={() => {
              void loadSavedProjects();
              setOpenProjectsPanel((v) => !v);
            }}
            className="rounded-lg border border-[#0f2848] px-4 py-2 text-sm font-medium text-[#0f2848]"
          >
            {t("openProject")}
          </button>
          <span className="self-center rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-medium text-[#047857]">{surveyPoints.length} {t("pointsLoaded")}</span>
        </div>
        {projectNotice ? <p className="text-xs font-medium text-emerald-700">{projectNotice}</p> : null}
        {savedProjectId ? <p className="text-[10px] text-[#9ca3af]">ID {savedProjectId.slice(-8)}</p> : null}
      </div>

      {openProjectsPanel ? (
        <section className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0f2848]">{t("projects.openTitle")}</h3>
          <p className="mt-1 text-xs text-[#6b7280]">{t("projects.openHint")}</p>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {savedProjects.length === 0 ? (
              <li className="rounded-lg border border-dashed border-[#d1d5db] px-4 py-6 text-center text-xs text-[#6b7280]">
                {t("projects.emptyList")}
              </li>
            ) : (
              savedProjects.map((item) => (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                    item.id === savedProjectId ? "border-[#00c8f0] bg-[#f0fdff]" : "border-[#e5e7eb]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#0f2848]">{item.name}</p>
                    <p className="text-[10px] text-[#6b7280]">
                      {t("projects.lastSaved", { date: formatSavedDate(item.updatedAt) })}
                      {" · "}
                      {item._count.surveyPoints} {t("pointsLoaded")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void openSavedProject(item.id)} className="rounded-md bg-[#0f2848] px-3 py-1.5 text-xs font-medium text-white">
                      {t("projects.open")}
                    </button>
                    <button type="button" onClick={() => void deleteSavedProject(item.id, item.name)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700">
                      {t("projects.remove")}
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setTab(item.id); if (item.id === "quality" && qualityRecords.length === 0) void loadQuality(); }}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium ${tab === item.id ? "bg-white text-[#0f2848] shadow-sm" : "text-[#6b7280]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {tab === "import" && (
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold text-[#111827]">{t("import.title")}</h2>
              <p className="mt-1 text-sm text-[#6b7280]">{t("import.description")}</p>
              <p className="mt-2 rounded-lg bg-[#f9fafb] px-3 py-2 font-mono text-xs text-[#6b7280]">
                {t("import.formatHint")}
              </p>
              <div className="mt-6 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[#d1d5db] bg-[#f9fafb] px-6 py-12 hover:border-[#00c8f0]" onClick={() => fileRef.current?.click()} role="button" tabIndex={0}>
                <p className="text-sm font-medium text-[#111827]">{t("import.dropzone")}</p>
                <p className="mt-1 text-xs text-[#9ca3af]">CSV · TXT · DXF · GeoJSON</p>
                <input ref={fileRef} type="file" accept=".csv,.txt,.dxf,.geojson,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
              </div>
              {parseWarnings.map((w) => <p key={w} className="mt-2 text-sm text-amber-700">⚠ {w}</p>)}
              {surveyPoints.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-[#374151]">{t("import.preview")}</p>
                      {coordinatesGeoreferenced && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                          {t("import.axesGeoreferenced")}
                        </span>
                      )}
                    </div>
                    <EnSwapButton label={t("import.swapEn")} onClick={applyEnGeoreference} />
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                  <table className="rtk-data-table w-full min-w-[520px] text-left text-sm text-[#111827]">
                    <thead className="border-b bg-[#f9fafb] text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-[#374151]">ID</th>
                        <th className="px-3 py-2 text-[#374151]">DESC</th>
                        <th className="px-3 py-2 text-[#374151]">
                          <span className="inline-flex items-center gap-2">
                            E
                            <EnSwapButton label={t("import.swapEn")} onClick={applyEnGeoreference} className="normal-case" />
                          </span>
                        </th>
                        <th className="px-3 py-2 text-[#374151]">N</th>
                        <th className="px-3 py-2 text-[#374151]">Z</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surveyPoints.slice(0, 10).map((p) => (
                        <tr key={p.id} className="border-b border-[#f3f4f6]">
                          <td className="px-3 py-2 font-medium text-[#111827]">{p.code ?? "—"}</td>
                          <td className="px-3 py-2 text-[#111827]">{p.description ?? p.name}</td>
                          <td className="px-3 py-2 font-mono text-xs text-[#111827]">{p.e.toFixed(3)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-[#111827]">{p.n.toFixed(3)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-[#111827]">{p.z.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {surveyPoints.length > 10 && (
                    <p className="px-3 py-2 text-xs text-[#6b7280]">+{surveyPoints.length - 10} pontos</p>
                  )}
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === "control" && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#111827]">{t("control.title")}</h2>
                <div className="flex flex-wrap gap-2">
                  {surveyPoints.length > 0 && (
                    <EnSwapButton label={t("control.swapAllEn")} onClick={applyEnGeoreference} />
                  )}
                  <button
                    type="button"
                    onClick={addControlPoint}
                    className="rounded-lg border border-[#00c8f0] px-3 py-1.5 text-sm text-[#0f2848]"
                  >
                    + {t("control.addPoint")}
                  </button>
                </div>
              </div>
              {surveyPoints.length === 0 && (
                <p className="rounded-lg border border-dashed bg-[#f9fafb] px-4 py-3 text-sm text-[#6b7280]">
                  {t("control.importFirst")}
                </p>
              )}
              {controlPoints.map((cp) => (
                <ControlPointCard
                  key={cp.id}
                  control={cp}
                  stats={controlWithStats.find((s) => s.id === cp.id)}
                  surveyPoints={surveyPoints}
                  onChange={patchControl}
                  onToggleExclude={toggleExclude}
                  onRemove={removeControl}
                  canRemove={controlPoints.length > 1}
                />
              ))}
              <p className="rounded-xl border bg-[#f0fdff] p-4 text-sm text-[#111827]">{t("control.globalRms")}: <strong className="font-mono text-[#111827]">{globalRms.toFixed(4)} m</strong></p>
            </section>
          )}

          {tab === "adjust" && (
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold text-[#111827]">{t("adjust.title")}</h2>
              <p className="mt-1 text-sm text-[#6b7280]">{t("adjust.description")}</p>
              <div className="mt-4 space-y-2">
                {([["TRANSLATION", t("adjust.translation")], ["HELMERT_2D", t("adjust.helmert2d")], ["HELMERT_3D", t("adjust.helmert3d")]] as const).map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 text-[#111827]">
                    <input type="radio" name="method" checked={method === value} onChange={() => setMethod(value)} />
                    <span className="text-sm font-medium text-[#111827]">{label}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={runAdjust} disabled={controlPoints.filter((p) => !p.excluded).length === 0} className="mt-6 rounded-lg bg-[#00c8f0] px-5 py-2.5 text-sm font-semibold text-[#0f2848] disabled:opacity-50">{t("adjust.run")}</button>
              {adjustmentResult && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[[t("adjust.rmsBefore"), adjustmentResult.rmsBefore], [t("adjust.rmsAfter"), adjustmentResult.rmsAfter], [t("adjust.rmsHorizAfter"), adjustmentResult.rmsHorizAfter], [t("adjust.rmsVertAfter"), adjustmentResult.rmsVertAfter]].map(([l, v]) => (
                    <div key={String(l)} className="rounded-lg bg-[#f9fafb] p-3"><p className="text-xs text-[#6b7280]">{l}</p><p className="font-mono text-lg font-bold text-[#111827]">{(v as number).toFixed(4)} m</p></div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "export" && (
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold text-[#111827]">{t("export.title")}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => downloadText(exportCsv(displayPoints), `${projectName}.csv`, "text/csv")} disabled={!displayPoints.length} className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm text-[#111827]">{t("export.download")} CSV</button>
                <button type="button" onClick={() => downloadOdsBlob(exportSurveyPointsOds(displayPoints, projectName), `${projectName}.ods`)} disabled={!displayPoints.length} className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm text-[#111827]">{t("export.download")} ODS</button>
                <button type="button" onClick={() => downloadText(exportDxf(displayPoints), `${projectName}.dxf`)} disabled={!displayPoints.length} className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm text-[#111827]">{t("export.download")} DXF</button>
                <button type="button" onClick={() => downloadText(exportGeoJson(displayPoints), `${projectName}.geojson`, "application/json")} disabled={!displayPoints.length} className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm text-[#111827]">{t("export.download")} GeoJSON</button>
                <button type="button" onClick={() => void exportPdf()} disabled={!adjustmentResult || exportingPdf} className="rounded-lg bg-[#0f2848] px-4 py-2 text-sm text-white disabled:opacity-50">{exportingPdf ? t("export.pdfGenerating") : t("export.pdf")}</button>
                <button type="button" onClick={openCadEnvironment} disabled={!displayPoints.length} className="rounded-lg bg-[#00c8f0] px-4 py-2 text-sm font-semibold text-[#0f2848] disabled:opacity-50">{t("export.openCad")}</button>
              </div>
              {adjustmentResult ? (
                <p className="mt-4 text-sm text-[#6b7280]">{t("export.cadHint")}</p>
              ) : (
                <p className="mt-4 text-sm text-amber-700">{t("export.cadHintNoAdjust")}</p>
              )}
            </section>
          )}

          {tab === "quality" && <QualityDashboard records={qualityRecords} loading={qualityLoading} />}
        </div>

        <aside className="space-y-4">
          <PointsMap
            surveyPoints={displayPoints}
            controlPoints={displayControls}
            ntripServer={user.ntrip.server}
            ntripPort={user.ntrip.port}
            className="sticky top-4"
          />
        </aside>
      </div>
    </div>
  );
}
