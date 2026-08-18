import { useState } from "react";
import type { FileItem, ShareItem, ShareRole } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { statusDot } from "./StatusBar";

const API = import.meta.env.VITE_API_URL ?? "";

const badgeVariant = {
  available: "green",
  uploading: "yellow",
  pending: "yellow",
  failed: "red",
  interrupted: "red",
} as const;

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

export function FileCard({ file, onChanged }: { file: FileItem; onChanged: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [shares, setShares] = useState<ShareItem[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function download() {
    try {
      const { url } = await api<{ url: string }>(`/api/files/${file.id}/download`);
      window.open(url, "_blank");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "download failed");
    }
  }

  async function share() {
    try {
      await api("/api/shares", {
        method: "POST",
        body: JSON.stringify({ fileId: file.id, email, role }),
      });
      setEmail("");
      setMsg("Shared");
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "share failed");
    }
  }

  async function loadShares() {
    try {
      const data = await api<{ shares: ShareItem[] }>(`/api/shares?fileId=${file.id}`);
      setShares(data.shares);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "cannot list shares");
    }
  }

  return (
    <div className="grid grid-cols-[12px_1fr_auto] items-start gap-3 border-b py-3">
      <span className={`mt-1.5 h-3 w-3 rounded-full ${statusDot(file.status)}`} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{file.originalName}</span>
          <Badge variant={badgeVariant[file.status]}>{file.status}</Badge>
          {file.role ? <Badge variant="outline">{file.role}</Badge> : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.progress}% · {file.completedParts.length}/{file.partCount} chunks
        </div>
        <div className="h-1.5 overflow-hidden rounded bg-muted">
          <div className={`h-full ${statusDot(file.status)}`} style={{ width: `${file.progress}%` }} />
        </div>
        {file.role === "owner" ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Input className="h-8 max-w-[220px]" placeholder="user@email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as ShareRole)}
            >
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="collaborator">collaborator</option>
            </select>
            <Button size="sm" onClick={() => void share()}>
              Share
            </Button>
            <Button size="sm" variant="outline" onClick={() => void loadShares()}>
              Shares
            </Button>
          </div>
        ) : null}
        {shares ? (
          <ul className="text-xs text-muted-foreground">
            {shares.map((s) => (
              <li key={s.id}>
                {s.email} — {s.role}
              </li>
            ))}
          </ul>
        ) : null}
        {msg ? <p className="text-xs text-red-600">{msg}</p> : null}
      </div>
      <Button size="sm" variant="outline" disabled={file.status !== "available"} onClick={() => void download()}>
        Download
      </Button>
    </div>
  );
}
