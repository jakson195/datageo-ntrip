"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runQueuedInEffect } from "@/lib/react/queue-in-effect";
import { useTranslations } from "next-intl";
import type { ControlPointInput, ControlPointWithStats, SurveyPoint } from "@/lib/rtk-validation/types";

function pointId(pt: SurveyPoint) {
  return pt.code?.trim() || pt.name?.trim() || "—";
}

function pointDescription(pt: SurveyPoint) {
  return pt.description?.trim() || "";
}

function pointLabel(pt: SurveyPoint) {
  const id = pointId(pt);
  const desc = pointDescription(pt);
  return desc ? `${id} — ${desc}` : id;
}

function surveySearchHaystack(pt: SurveyPoint) {
  return [
    pt.code,
    pt.name,
    pt.description,
    pt.properties?.code as string | undefined,
    pt.properties?.description as string | undefined,
    pt.e.toFixed(4),
    pt.n.toFixed(4),
    pt.z.toFixed(4),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function observedPatchFromSurvey(pt: SurveyPoint): Partial<ControlPointInput> {
  return {
    source: "imported",
    linkedSurveyPointId: pt.id,
    name: pointId(pt),
    observedCode: pointId(pt),
    observedDescription: pointDescription(pt),
    eObserved: pt.e,
    nObserved: pt.n,
    zObserved: pt.z,
  };
}

export function ControlPointCard({
  control,
  stats,
  surveyPoints,
  onChange,
  onToggleExclude,
  onRemove,
  canRemove,
}: {
  control: ControlPointInput;
  stats?: ControlPointWithStats;
  surveyPoints: SurveyPoint[];
  onChange: (id: string, patch: Partial<ControlPointInput>) => void;
  onToggleExclude: (id: string) => void;
  onRemove?: (id: string) => void;
  canRemove?: boolean;
}) {
  const t = useTranslations("rtkValidation.control");
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const mode = control.source ?? "manual";
  const observedLocked = mode === "imported" && !!control.linkedSurveyPointId;

  const linkedPoint = control.linkedSurveyPointId
    ? surveyPoints.find((p) => p.id === control.linkedSurveyPointId)
    : undefined;

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return surveyPoints;
    const tokens = q.split(/\s+/).filter(Boolean);
    return surveyPoints.filter((pt) => {
      const hay = surveySearchHaystack(pt);
      return tokens.every((token) => hay.includes(token));
    });
  }, [search, surveyPoints]);

  useEffect(
    () =>
      runQueuedInEffect(() => {
        if (mode !== "imported" || !linkedPoint) return;
        setSearch(pointLabel(linkedPoint));
      }),
    [mode, linkedPoint?.id],
  );

  const selectImportedPoint = (surveyPointId: string) => {
    const pt = surveyPoints.find((p) => p.id === surveyPointId);
    if (!pt) return;
    onChange(control.id, observedPatchFromSurvey(pt));
    setSearch(pointLabel(pt));
  };

  const setManualMode = () => {
    onChange(control.id, {
      source: "manual",
      linkedSurveyPointId: undefined,
      observedCode: undefined,
      observedDescription: undefined,
    });
    setSearch("");
  };

  const setImportedMode = () => {
    onChange(control.id, { source: "imported" });
    setSearch("");
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredPoints.length > 0) {
      e.preventDefault();
      selectImportedPoint(filteredPoints[0].id);
    }
  };

  const patchKnown = (axis: "e" | "n" | "z", value: number) => {
    const key = axis === "e" ? "eKnown" : axis === "n" ? "nKnown" : "zKnown";
    onChange(control.id, { [key]: value });
  };

  const patchObserved = (axis: "e" | "n" | "z", value: number) => {
    const key = axis === "e" ? "eObserved" : axis === "n" ? "nObserved" : "zObserved";
    onChange(control.id, { [key]: value });
  };

  const readonlyInput = observedLocked ? "bg-[#f9fafb]" : "bg-white";

  return (
    <div className={`rounded-xl border bg-white p-4 ${control.excluded ? "opacity-60" : ""}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={control.name}
          onChange={(e) => onChange(control.id, { name: e.target.value })}
          className="w-24 rounded border border-[#d1d5db] px-2 py-1 text-sm font-semibold text-[#111827]"
          placeholder={t("pointName")}
        />
        <div className="ml-auto flex items-center gap-3">
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(control.id)}
              className="text-xs text-[#6b7280] hover:text-red-600"
            >
              {t("remove")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleExclude(control.id)}
            className="text-xs text-[#6b7280] hover:text-red-600"
          >
            {control.excluded ? t("include") : t("exclude")}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={setManualMode}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            mode === "manual" ? "bg-[#0f2848] text-white" : "border border-[#d1d5db] text-[#374151]"
          }`}
        >
          {t("manualEntry")}
        </button>
        <button
          type="button"
          disabled={surveyPoints.length === 0}
          onClick={setImportedMode}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
            mode === "imported" ? "bg-[#00c8f0] text-[#0f2848]" : "border border-[#d1d5db] text-[#374151]"
          }`}
        >
          {t("fromImport")}
        </button>
      </div>

      {mode === "imported" && (
        <div className="mb-4 rounded-lg border border-[#e0f2fe] bg-[#f0fdff] p-3">
          <label className="block text-xs font-medium text-[#0f2848]">{t("searchImported")}</label>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("searchPlaceholder")}
            list={`survey-points-${control.id}`}
            className="mt-1 w-full rounded border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
          />
          <datalist id={`survey-points-${control.id}`}>
            {surveyPoints.map((pt) => (
              <option key={pt.id} value={pointLabel(pt)} />
            ))}
          </datalist>
          <p className="mt-2 text-[11px] text-[#6b7280]">
            {search.trim()
              ? t("pointsFiltered", { count: filteredPoints.length, total: surveyPoints.length })
              : t("pointsAvailable", { count: surveyPoints.length })}
          </p>
          <div className="mt-2 overflow-hidden rounded border border-[#d1d5db] bg-white">
            <div className="grid grid-cols-[minmax(2.5rem,0.6fr)_minmax(4rem,1.4fr)_repeat(3,minmax(4.5rem,1fr))] gap-1 border-b bg-[#f9fafb] px-2 py-1.5 text-[10px] font-semibold uppercase text-[#6b7280]">
              <span>ID</span>
              <span>DESC</span>
              <span>E</span>
              <span>N</span>
              <span>Z</span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredPoints.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-[#6b7280]">{t("noPointsFound")}</p>
              ) : (
                filteredPoints.map((pt) => {
                  const desc = pointDescription(pt);
                  const selected = control.linkedSurveyPointId === pt.id;
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => selectImportedPoint(pt.id)}
                      className={`grid w-full grid-cols-[minmax(2.5rem,0.6fr)_minmax(4rem,1.4fr)_repeat(3,minmax(4.5rem,1fr))] gap-1 border-b border-[#f3f4f6] px-2 py-2 text-left text-xs last:border-b-0 hover:bg-[#f0fdff] ${
                        selected ? "bg-[#e0f2fe] font-medium text-[#0f2848]" : "text-[#111827]"
                      }`}
                    >
                      <span className="truncate font-semibold">{pointId(pt)}</span>
                      <span className="truncate text-[#374151]">{desc || "—"}</span>
                      <span className="truncate font-mono">{pt.e.toFixed(3)}</span>
                      <span className="truncate font-mono">{pt.n.toFixed(3)}</span>
                      <span className="truncate font-mono">{pt.z.toFixed(3)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium text-[#374151]">{t("known")}</legend>
          {(["e", "n", "z"] as const).map((axis) => {
            const value = axis === "e" ? control.eKnown : axis === "n" ? control.nKnown : control.zKnown;
            return (
              <label key={`known-${axis}`} className="mt-2 block text-xs text-[#374151]">
                {axis.toUpperCase()}
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => patchKnown(axis, Number(e.target.value.replace(",", ".")) || 0)}
                  className="mt-0.5 w-full rounded border border-[#d1d5db] px-2 py-1 font-mono text-sm text-[#111827]"
                />
              </label>
            );
          })}
        </fieldset>

        <fieldset className="rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium text-[#374151]">{t("observed")}</legend>
          <label className="mt-2 block text-xs text-[#374151]">
            ID
            <input
              type="text"
              value={control.observedCode ?? ""}
              readOnly={observedLocked}
              onChange={(e) => onChange(control.id, { observedCode: e.target.value })}
              className={`mt-0.5 w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827] ${readonlyInput}`}
            />
          </label>
          <label className="mt-2 block text-xs text-[#374151]">
            DESC
            <input
              type="text"
              value={control.observedDescription ?? ""}
              readOnly={observedLocked}
              onChange={(e) => onChange(control.id, { observedDescription: e.target.value })}
              className={`mt-0.5 w-full rounded border border-[#d1d5db] px-2 py-1 text-sm text-[#111827] ${readonlyInput}`}
            />
          </label>
          {(["e", "n", "z"] as const).map((axis) => {
            const value =
              axis === "e" ? control.eObserved : axis === "n" ? control.nObserved : control.zObserved;
            return (
              <label key={`obs-${axis}`} className="mt-2 block text-xs text-[#374151]">
                {axis.toUpperCase()}
                <input
                  type="number"
                  step="any"
                  value={value}
                  readOnly={observedLocked}
                  onChange={(e) =>
                    patchObserved(axis, Number(e.target.value.replace(",", ".")) || 0)
                  }
                  className={`mt-0.5 w-full rounded border border-[#d1d5db] px-2 py-1 font-mono text-sm text-[#111827] ${readonlyInput}`}
                />
              </label>
            );
          })}
        </fieldset>
      </div>

      {stats && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
          {[
            ["ΔE", stats.deltaE],
            ["ΔN", stats.deltaN],
            ["ΔZ", stats.deltaZ],
            [t("horiz"), stats.horizError],
            [t("vert"), stats.vertError],
            ["RMS", stats.rms],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded bg-[#f9fafb] px-2 py-1.5">
              <span className="text-[#6b7280]">{label}</span>
              <p className="font-mono font-medium text-[#111827]">{(val as number).toFixed(4)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
