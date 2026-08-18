import { type FormEvent, useCallback, useEffect, useState } from "react";
import { FileList } from "../components/FileList";
import { StatusBar } from "../components/StatusBar";
import { UploadModal } from "../components/UploadModal";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useSocket } from "../hooks/useSocket";
import type { AppEvent, FileItem, Metrics, User } from "../types";

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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [live, setLive] = useState("waiting for events");

  const load = useCallback(async () => {
    try {
      const me = await api<User>("/api/status/me");
      setUser(me);
      const [list, m] = await Promise.all([
        api<{ files: FileItem[] }>("/api/files"),
        api<Metrics>("/api/status/metrics"),
      ]);
      setFiles(list.files);
      setMetrics(m);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connected = useSocket(Boolean(user), (event: AppEvent) => {
    setLive(`${event.name} · ${event.at}`);
    void load();
  });

  async function onAuth(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    try {
      await api(`/api/status/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await load();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "auth failed");
    }
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <h1 className="text-2xl font-semibold">Dropbyte</h1>
        <form className="space-y-3" onSubmit={(e) => void onAuth(e)}>
          <Input type="email" required placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required minLength={6} placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
          <Button className="w-full" type="submit">
            {mode === "login" ? "Login" : "Register"}
          </Button>
        </form>
        <Button variant="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account?" : "Have an account?"}
        </Button>
      </div>
    );
  }

  const rows = metrics
    ? [
        ["Upload speed", `${metrics.uploadSpeedBps} B/s`],
        ["Latency", `${metrics.latencyMs} ms`],
        ["Concurrent users", String(metrics.concurrentUsers)],
        ["Failure rate", String(metrics.failureRate)],
        ["Uploads ok / fail", `${metrics.uploadsOk} / ${metrics.uploadsFailed}`],
        ["Worker PID", String(metrics.pid)],
        ["Postgres / Storage", `${metrics.postgres ? "up" : "down"} / ${metrics.storage ? "up" : "down"}`],
      ]
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dropbyte</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <UploadModal onChanged={() => void load()} />
          <Button
            variant="outline"
            onClick={() => {
              void api("/api/status/logout", { method: "POST" }).then(() => setUser(null));
            }}
          >
            Logout
          </Button>
        </div>
      </div>
      <StatusBar connected={connected} liveStatus={live} />
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2 font-medium">Metric</th>
              <th className="px-3 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b last:border-0">
                <td className="px-3 py-2">{k}</td>
                <td className="px-3 py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FileList files={files} onChanged={() => void load()} />
    </div>
  );
}
