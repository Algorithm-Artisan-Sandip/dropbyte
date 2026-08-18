import type { CompletedPart } from "../types";

export const CHUNK_SIZE = 8 * 1024 * 1024;

export function partCountFor(size: number, chunkSize = CHUNK_SIZE): number {
  return Math.max(1, Math.ceil(size / chunkSize));
}

export function completedPartNumbers(parts: CompletedPart[]): number[] {
  return [...new Set(parts.map((p) => p.partNumber))].sort((a, b) => a - b);
}

export function nextMissingPart(parts: CompletedPart[], partCount: number): number | null {
  const done = new Set(parts.map((p) => p.partNumber));
  for (let n = 1; n <= partCount; n += 1) {
    if (!done.has(n)) return n;
  }
  return null;
}

export function progressPct(parts: CompletedPart[], size: number): number {
  if (size <= 0) return 0;
  const uploaded = parts.reduce((sum, p) => sum + p.size, 0);
  return Math.min(100, Math.round((uploaded / size) * 100));
}
