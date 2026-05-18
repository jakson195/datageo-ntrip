"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const ACCEPT = ".jpg,.jpeg,.png,.tif,.tiff,image/jpeg,image/png,image/tiff";
const MAX_FILE_MB = 50;

type Phase = "idle" | "uploading" | "processing" | "ready" | "error";

interface JobResponse {
  id: string;
  status: string;
  progress: number;
  message: string;
  downloads: { name: string; url: string; label: string }[];
  error: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProcessamentoForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<JobResponse["downloads"]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    const valid = list.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return ["jpg", "jpeg", "png", "tif", "tiff"].includes(ext);
    });
    if (valid.length < list.length) {
      setErrorMsg("Alguns arquivos foram ignorados (apenas jpg, png, tiff).");
    } else {
      setErrorMsg(null);
    }
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [`${f.name}-${f.size}`, f]));
      for (const f of valid) map.set(`${f.name}-${f.size}`, f);
      return Array.from(map.values());
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const pollJob = useCallback(async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) throw new Error("Não foi possível consultar o status.");
    const data = (await res.json()) as JobResponse;
    setProgress(data.progress);
    setStatusText(data.message);

    if (data.status === "ready") {
      setPhase("ready");
      setDownloads(data.downloads);
      return true;
    }
    if (data.status === "error") {
      setPhase("error");
      setErrorMsg(data.error ?? data.message);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (phase !== "processing" || !jobId) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const done = await pollJob(jobId);
        if (!cancelled && !done) {
          window.setTimeout(tick, 1200);
        }
      } catch {
        if (!cancelled) {
          setPhase("error");
          setErrorMsg("Erro ao acompanhar o processamento.");
        }
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [phase, jobId, pollJob]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (files.length === 0) {
      setErrorMsg("Selecione pelo menos uma imagem.");
      return;
    }

    const oversize = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversize) {
      setErrorMsg(`Arquivo acima de ${MAX_FILE_MB} MB: ${oversize.name}`);
      return;
    }
    setPhase("uploading");
    setProgress(5);
    setStatusText("Enviando imagens…");

    const formData = new FormData();
    if (projectName.trim()) formData.set("projectName", projectName.trim());
    for (const f of files) formData.append("files", f);

    let uploadedId: string;
    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadJson = (await uploadRes.json()) as {
        jobId?: string;
        error?: string;
      };
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error ?? "Falha no upload.");
      }
      uploadedId = uploadJson.jobId!;
      setJobId(uploadedId);
      setProgress(20);
      setStatusText("Upload concluído. Iniciando processamento…");
    } catch (err) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro no upload.");
      return;
    }

    setPhase("processing");
    try {
      const processRes = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: uploadedId }),
      });
      const processJson = (await processRes.json()) as { error?: string };
      if (!processRes.ok) {
        throw new Error(processJson.error ?? "Falha ao iniciar processamento.");
      }
      setStatusText("Processando imagens…");
      await pollJob(uploadedId);
    } catch (err) {
      setPhase("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Erro ao iniciar processamento.",
      );
    }
  }

  function resetForm() {
    setFiles([]);
    setProjectName("");
    setPhase("idle");
    setProgress(0);
    setStatusText("");
    setJobId(null);
    setDownloads([]);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-card-border bg-card/50 hover:border-drone/40"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          id="file-input"
          disabled={busy}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <p className="text-4xl" aria-hidden>
            📷
          </p>
          <p className="mt-4 font-medium">
            Arraste imagens aqui ou{" "}
            <span className="text-drone underline">clique para selecionar</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            JPG, PNG ou TIFF · até {MAX_FILE_MB} MB por arquivo · sem limite total
            por envio
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border border-card-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium">
              {files.length} arquivo{files.length !== 1 ? "s" : ""} ·{" "}
              {formatBytes(totalBytes)}
            </p>
            {!busy && (
              <button
                type="button"
                className="text-xs text-muted hover:text-foreground"
                onClick={() => {
                  setFiles([]);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Limpar
              </button>
            )}
          </div>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
            {files.map((f) => (
              <li key={`${f.name}-${f.size}`} className="truncate">
                {f.name} ({formatBytes(f.size)})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor="projectName" className="block text-sm font-medium">
          Nome do projeto <span className="text-muted">(opcional)</span>
        </label>
        <input
          id="projectName"
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={busy}
          placeholder="Ex.: Fazenda Norte — talhão 3"
          className="mt-2 w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent/50"
          maxLength={120}
        />
      </div>

      {phase !== "idle" && (
        <div className="rounded-xl border border-card-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium capitalize">
              {phase === "uploading" && "Enviando"}
              {phase === "processing" && "Processando"}
              {phase === "ready" && "Concluído"}
              {phase === "error" && "Erro"}
            </span>
            <span className="text-muted">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                phase === "error" ? "bg-red-500" : "bg-accent"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {statusText && (
            <p className="mt-3 text-sm text-muted">{statusText}</p>
          )}
          {phase === "ready" && downloads.length > 0 && (
            <ul className="mt-4 space-y-2">
              {downloads.map((d) => (
                <li key={d.name}>
                  <a
                    href={d.url}
                    download
                    className="inline-flex items-center gap-2 rounded-full border border-drone/40 bg-drone/10 px-4 py-2 text-sm font-medium text-drone transition hover:bg-drone/20"
                  >
                    ↓ {d.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {(phase === "ready" || phase === "error") && (
            <button
              type="button"
              onClick={resetForm}
              className="mt-4 text-sm text-muted underline hover:text-foreground"
            >
              Novo envio
            </button>
          )}
        </div>
      )}

      {errorMsg && phase !== "processing" && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMsg}
        </p>
      )}

      <div className="flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={busy || files.length === 0}
          className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-background transition hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Aguarde…" : "Iniciar processamento"}
        </button>
        <Link
          href="/"
          className="rounded-full border border-card-border px-6 py-3 text-sm font-medium transition hover:border-accent/40"
        >
          Voltar ao início
        </Link>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        MVP: gera mosaico de pré-visualização e ZIP com miniaturas. Em produção,
        este fluxo conecta a OpenDroneMap/WebODM ou worker na nuvem para
        ortomosaico GeoTIFF, DSM e nuvem de pontos.
      </p>
    </form>
  );
}
