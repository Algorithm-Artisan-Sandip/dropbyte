export type FileStatus = "pending" | "uploading" | "available" | "failed" | "interrupted";
export type ShareRole = "owner" | "viewer" | "editor" | "collaborator";

export interface User {
  id: string;
  email: string;
}

export interface FileItem {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  status: FileStatus;
  progress: number;
  partCount: number;
  chunkSize: number;
  completedParts: number[];
  role?: ShareRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface Metrics {
  uploadSpeedBps: number;
  latencyMs: number;
  concurrentUsers: number;
  failureRate: number;
  uploadsOk: number;
  uploadsFailed: number;
  bytesUploaded: number;
  postgres: boolean;
  storage: boolean;
  pid: number;
}

export interface AppEvent {
  name: string;
  payload: Record<string, unknown>;
  at: string;
  workerId: number;
}

export interface ShareItem {
  id: string;
  email: string;
  role: ShareRole;
}
