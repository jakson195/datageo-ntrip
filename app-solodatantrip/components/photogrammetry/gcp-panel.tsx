"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buildGcpListText, countGcpObservations, linkDetectionsToGcps } from "@/lib/photogrammetry/gcp-list";
import type { PhotogrammetryGcp, PhotogrammetryProject, PhotogrammetrySettings } from "@/lib/photogrammetry/types";
import { detectWhiteXInFile } from "@/lib/photogrammetry/white-x-detector";

function newGcp(index: number): PhotogrammetryGcp {
  return {
    id: `gcp_${Date.now().toString(36)}_${index}`,
    name: `PC${index}`,
    easting: 0,
    northing: 0,
    elevation: 0,
    observations: [],
  };
}

type Props = {
  project: PhotogrammetryProject;
  fileMap: Map<string, File>;
  onChange: (patch: Partial<PhotogrammetryProject> | ((p: PhotogrammetryProject) => PhotogrammetryProject)) => void;
  onUpdateSettings: (patch: Partial<PhotogrammetrySettings>) => void;
  selectedGcpId: string | null;
  onSelectGcp: (id: string | null) => void;
};

export function GcpPanel({ project, fileMap, onChange, onUpdateSettings, selectedGcpId, onSelectGcp }: Props) {
  const t = useTranslations("photogrammetry.gcp");
  const [detecting, setDetecting] = useState(false);

  const obsCount = countGcpObservations(project.gcps);

  function patchGcps(updater: (gcps: PhotogrammetryGcp[]) => PhotogrammetryGcp[]) {
    onChange((prev) => ({ ...prev, gcps: updater(prev.gcps) }));
  }

  function addGcp() {
    patchGcps((gcps) => [...gcps, newGcp(gcps.length + 1)]);
  }

  function updateGcp(id: string, patch: Partial<PhotogrammetryGcp>) {
    patchGcps((gcps) => gcps.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function removeGcp(id: string) {
    patchGcps((gcps) => gcps.filter((g) => g.id !== id));
    if (selectedGcpId === id) onSelectGcp(null);
  }

  async function runAutoDetect() {
    if (!project.settings.fieldTargetWhiteX || project.photos.length === 0) return;
    setDetecting(true);
    try {
      const nextGcps = project.gcps.map((g) => ({ ...g, observations: [] as PhotogrammetryGcp["observations"] }));
      let totalMarks = 0;
      let linkedMarks = 0;

      for (const photo of project.photos) {
        const file = fileMap.get(photo.id);
        if (!file) continue;
        const detections = await detectWhiteXInFile(file);
        totalMarks += detections.length;
        if (!detections.length || !nextGcps.length) continue;

        const linked = linkDetectionsToGcps(nextGcps, detections);
        for (const [name, det] of linked) {
          const idx = nextGcps.findIndex((g) => g.name === name);
          if (idx < 0) continue;
          nextGcps[idx] = {
            ...nextGcps[idx],
            observations: [
              ...nextGcps[idx].observations.filter((o) => o.photoId !== photo.id),
              {
                photoId: photo.id,
                fileName: photo.fileName,
                pixelX: det.pixelX,
                pixelY: det.pixelY,
                autoDetected: true,
              },
            ],
          };
          linkedMarks++;
        }
      }

      onChange((prev) => ({
        ...prev,
        gcps: nextGcps,
        logs: [
          ...prev.logs,
          `[${new Date().toLocaleTimeString()}] ${t("detectLog", {
            marks: totalMarks,
            linked: linkedMarks,
            obs: countGcpObservations(nextGcps),
          })}`,
        ],
      }));
    } finally {
      setDetecting(false);
    }
  }

  function enableGcpMode(enabled: boolean) {
    onUpdateSettings({ useGcp: enabled, fieldTargetWhiteX: enabled ? project.settings.fieldTargetWhiteX : false });
    if (enabled && project.gcps.length === 0) {
      patchGcps(() => [newGcp(1), newGcp(2), newGcp(3)]);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-[#e5e7eb] pt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{t("title")}</h4>

      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={project.settings.useGcp}
          onChange={(e) => enableGcpMode(e.target.checked)}
        />
        <span>
          {t("enable")}
          <span className="mt-0.5 block text-[10px] text-[#9ca3af]">{t("enableHint")}</span>
        </span>
      </label>

      {project.settings.useGcp ? (
        <>
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={project.settings.fieldTargetWhiteX}
              onChange={(e) => onUpdateSettings({ fieldTargetWhiteX: e.target.checked })}
            />
            <span>
              {t("whiteX")}
              <span className="mt-0.5 block text-[10px] text-[#9ca3af]">{t("whiteXHint")}</span>
            </span>
          </label>

          <label className="block text-xs">
            {t("projection")}
            <input
              value={project.settings.gcpProjection}
              onChange={(e) => onUpdateSettings({ gcpProjection: e.target.value })}
              placeholder="EPSG:4326"
              className="mt-1 w-full rounded-lg border border-[#d1d5db] px-2 py-1.5 font-mono text-[11px]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addGcp}
              className="rounded-lg border border-[#d1d5db] px-2 py-1 text-[11px] hover:bg-[#f9fafb]"
            >
              {t("addPoint")}
            </button>
            {project.settings.fieldTargetWhiteX ? (
              <button
                type="button"
                disabled={detecting || project.photos.length === 0 || project.gcps.length === 0}
                onClick={() => void runAutoDetect()}
                className="rounded-lg bg-[#00c8f0] px-2 py-1 text-[11px] font-semibold text-[#0f2848] disabled:opacity-40"
              >
                {detecting ? t("detecting") : t("autoDetect")}
              </button>
            ) : null}
          </div>

          <p className="text-[10px] text-[#6b7280]">{t("obsSummary", { count: obsCount, min: 3 })}</p>

          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {project.gcps.map((gcp) => (
              <li key={gcp.id} className="rounded-lg border border-[#e5e7eb] p-2 text-[11px]">
                <div className="flex items-center gap-1">
                  <input
                    value={gcp.name}
                    onChange={(e) => updateGcp(gcp.id, { name: e.target.value })}
                    className="w-14 rounded border border-[#d1d5db] px-1 py-0.5 font-semibold"
                  />
                  <input
                    type="number"
                    step="any"
                    title={t("easting")}
                    value={gcp.easting || ""}
                    onChange={(e) => updateGcp(gcp.id, { easting: Number(e.target.value) })}
                    className="min-w-0 flex-1 rounded border border-[#d1d5db] px-1 py-0.5"
                    placeholder={t("easting")}
                  />
                  <input
                    type="number"
                    step="any"
                    title={t("northing")}
                    value={gcp.northing || ""}
                    onChange={(e) => updateGcp(gcp.id, { northing: Number(e.target.value) })}
                    className="min-w-0 flex-1 rounded border border-[#d1d5db] px-1 py-0.5"
                    placeholder={t("northing")}
                  />
                  <input
                    type="number"
                    step="any"
                    title={t("elevation")}
                    value={gcp.elevation || ""}
                    onChange={(e) => updateGcp(gcp.id, { elevation: Number(e.target.value) })}
                    className="w-16 rounded border border-[#d1d5db] px-1 py-0.5"
                    placeholder="Z"
                  />
                  <button type="button" onClick={() => removeGcp(gcp.id)} className="text-red-600">
                    ×
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-[#9ca3af]">
                  {t("obsCount", { count: gcp.observations.length })}
                  {gcp.observations.some((o) => o.autoDetected) ? ` · ${t("autoTag")}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectGcp(selectedGcpId === gcp.id ? null : gcp.id)}
                  className={`mt-1 text-[10px] underline ${selectedGcpId === gcp.id ? "text-[#0f2848]" : "text-[#6b7280]"}`}
                >
                  {selectedGcpId === gcp.id ? t("markingActive") : t("markOnPhoto")}
                </button>
              </li>
            ))}
          </ul>

          {buildGcpListText(project.gcps, project.settings.gcpProjection) ? (
            <p className="text-[10px] text-emerald-700">{t("readyForOdm")}</p>
          ) : (
            <p className="text-[10px] text-amber-700">{t("needObservations")}</p>
          )}
        </>
      ) : null}
    </div>
  );
}

export function applyManualGcpMark(
  project: PhotogrammetryProject,
  gcpId: string,
  photoId: string,
  fileName: string,
  pixelX: number,
  pixelY: number,
): PhotogrammetryGcp[] {
  return project.gcps.map((g) =>
    g.id !== gcpId
      ? g
      : {
          ...g,
          observations: [
            ...g.observations.filter((o) => o.photoId !== photoId),
            { photoId, fileName, pixelX, pixelY, autoDetected: false },
          ],
        },
  );
}
