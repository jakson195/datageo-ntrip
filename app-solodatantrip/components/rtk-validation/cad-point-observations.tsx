"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { CadEntity, CadPointEntity } from "@/lib/rtk-validation/cad/types";

const OBSERVATION_LAYER_IDS = new Set(["rtk_points", "ctrl_known", "ctrl_obs"]);

type CadPointObservationsProps = {
  entities: CadEntity[];
  layers: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function layerName(layers: CadPointObservationsProps["layers"], layerId: string) {
  return layers.find((l) => l.id === layerId)?.name ?? layerId;
}

export function CadPointObservations({
  entities,
  layers,
  selectedId,
  onSelect,
}: CadPointObservationsProps) {
  const t = useTranslations("rtkCad.observations");
  const [open, setOpen] = useState(true);

  const points = useMemo(
    () =>
      entities.filter(
        (e): e is CadPointEntity =>
          e.type === "point" && OBSERVATION_LAYER_IDS.has(e.layerId),
      ),
    [entities],
  );

  if (points.length === 0) return null;

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-[#0f2848]">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-[#6b7280]">
            {t("count", { count: points.length })}
          </p>
        </div>
        <span className="text-xs text-[#6b7280]">{open ? "▾" : "▸"}</span>
      </button>

      {open ? (
        <div className="border-t border-[#e5e7eb] px-4 pb-4">
          <p className="pt-3 text-xs text-[#6b7280]">{t("hint")}</p>
          <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-[#e5e7eb]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#f9fafb] text-[#6b7280]">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("point")}</th>
                  <th className="px-3 py-2 font-medium">{t("layer")}</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">E</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">N</th>
                  <th className="px-3 py-2 font-medium">Z</th>
                </tr>
              </thead>
              <tbody>
                {points.map((pt) => {
                  const active = pt.id === selectedId;
                  return (
                    <tr
                      key={pt.id}
                      className={active ? "bg-[#f0fdff]" : "hover:bg-[#f9fafb]"}
                    >
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => onSelect(pt.id)}
                          className="font-medium text-[#0f2848] hover:text-[#0891b2]"
                        >
                          {pt.label ?? pt.id}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-[#6b7280]">
                        {layerName(layers, pt.layerId)}
                      </td>
                      <td className="hidden px-3 py-2 font-mono text-[#374151] sm:table-cell">
                        {pt.x.toFixed(3)}
                      </td>
                      <td className="hidden px-3 py-2 font-mono text-[#374151] sm:table-cell">
                        {pt.y.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#374151]">
                        {pt.z.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );

}
