import { useCallback, useRef, useState } from "react";
import type { FileItem } from "../types";

const API = import.meta.env.VITE_API_URL ?? "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function storageKey(file: File) {
  return `dropbyte:upload:${file.name}:${file.size}:${file.lastModified}`;
}

export function useUpload(onChanged: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef(false);

  const run = useCallback(
    async (local: File) => {
      abort.current = false;
      setBusy(true);
      setError(null);
      try {
        let meta: FileItem | null = null;
        const saved = localStorage.getItem(storageKey(local));
        if (saved) {
          try {
            meta = await api<FileItem>(`/api/files/${saved}/resume`);
          } catch {
            localStorage.removeItem(storageKey(local));
          }
        }
        if (!meta) {
          meta = await api<FileItem>("/api/files/init", {
            method: "POST",
            body: JSON.stringify({ filename: local.name, size: local.size, mimeType: local.type }),
          });
          localStorage.setItem(storageKey(local), meta.id);
        }

        const done = new Set(meta.completedParts ?? []);
        for (let part = 1; part <= meta.partCount; part += 1) {
          if (abort.current) {
            await api(`/api/files/${meta.id}/interrupt`, { method: "POST" });
            return;
          }
          if (done.has(part)) continue;
          const { url, skipped } = await api<{ url?: string; skipped?: boolean }>(
            `/api/files/${meta.id}/part-url/${part}`,
          );
          if (skipped) continue;
          const start = (part - 1) * meta.chunkSize;
          const blob = local.slice(start, Math.min(start + meta.chunkSize, local.size));
          const put = await fetch(url!, { method: "PUT", body: blob });
          if (!put.ok) throw new Error(`MinIO part ${part} failed`);
          const etag = put.headers.get("ETag") || put.headers.get("etag");
          if (!etag) throw new Error("Missing ETag from storage (check CORS ExposeHeaders)");
          await api(`/api/files/${meta.id}/parts`, {
            method: "POST",
            body: JSON.stringify({ partNumber: part, etag, size: blob.size }),
          });
          onChanged();
        }
        await api(`/api/files/${meta.id}/complete`, { method: "POST" });
        localStorage.removeItem(storageKey(local));
        onChanged();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [onChanged],
  );

  return { run, busy, error, cancel: () => { abort.current = true; } };
}
