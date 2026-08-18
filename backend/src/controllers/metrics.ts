import { EventNames, emitAppEvent } from "../events/eventEmitter";

const mem = {
  bytes: 0,
  ms: 0,
  ok: 0,
  fail: 0,
  sockets: 0,
  latency: 0,
};

export async function bumpSockets(delta: number): Promise<void> {
  mem.sockets = Math.max(0, mem.sockets + delta);
}

export async function recordLatency(ms: number): Promise<void> {
  mem.latency = ms;
}

export async function recordUpload(ok: boolean, bytes: number, ms: number): Promise<void> {
  if (ok) {
    mem.ok += 1;
    mem.bytes += bytes;
    mem.ms += Math.max(1, Math.round(ms));
  } else {
    mem.fail += 1;
  }
  await emitAppEvent(null, EventNames.MetricsUpdated, await readMetrics());
}

export async function readMetrics(): Promise<Record<string, unknown>> {
  const total = mem.ok + mem.fail;
  return {
    uploadSpeedBps: mem.ms > 0 ? Math.round((mem.bytes / mem.ms) * 1000) : 0,
    latencyMs: mem.latency,
    concurrentUsers: mem.sockets,
    failureRate: total > 0 ? Number((mem.fail / total).toFixed(4)) : 0,
    uploadsOk: mem.ok,
    uploadsFailed: mem.fail,
    bytesUploaded: mem.bytes,
  };
}
