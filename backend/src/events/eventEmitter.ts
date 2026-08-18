import { EventEmitter } from "events";

export const CHANNEL = "dropbyte:events";

export const EventNames = {
  FileUploaded: "FileUploaded",
  FileAccessAttempted: "FileAccessAttempted",
  ServerFailureDetected: "ServerFailureDetected",
  UploadProgress: "UploadProgress",
  FileStatusChanged: "FileStatusChanged",
  UploadInterrupted: "UploadInterrupted",
  MetricsUpdated: "MetricsUpdated",
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];

export interface AppEvent {
  name: EventName;
  payload: Record<string, unknown>;
  at: string;
  workerId: number;
}

export const appEvents = new EventEmitter();
appEvents.setMaxListeners(50);

export function emitLocal(name: EventName, payload: Record<string, unknown> = {}): AppEvent {
  const event: AppEvent = {
    name,
    payload,
    at: new Date().toISOString(),
    workerId: process.pid,
  };
  appEvents.emit(name, event);
  appEvents.emit("*", event);
  return event;
}

export async function emitAppEvent(
  _pub: unknown,
  name: EventName,
  payload: Record<string, unknown> = {},
): Promise<void> {
  emitLocal(name, payload);
}

export async function subscribeAppEvents(
  _sub: unknown,
  _onRemote: (event: AppEvent) => void,
): Promise<void> {
  return;
}
