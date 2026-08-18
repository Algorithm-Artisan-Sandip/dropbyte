import type { FileStatus } from "../types";

const color: Record<FileStatus, string> = {
  available: "bg-emerald-500",
  uploading: "bg-amber-400",
  pending: "bg-amber-400",
  failed: "bg-red-500",
  interrupted: "bg-red-500",
};

export function StatusBar({
  connected,
  liveStatus,
}: {
  connected: boolean;
  liveStatus?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
        <span>{connected ? "Live" : "Disconnected"}</span>
      </div>
      <span className="text-muted-foreground">{liveStatus ?? "waiting for events"}</span>
    </div>
  );
}

export function statusDot(status: FileStatus) {
  return color[status];
}
