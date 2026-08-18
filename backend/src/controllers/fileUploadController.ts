import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { valkeyPub } from "../config/valkey.config";
import { EventNames, emitAppEvent } from "../events/eventEmitter";
import { FileModel } from "../models/File";
import { Share } from "../models/Share";
import { abortMultipart, completeMultipart, presignDownload, presignPart, startMultipart } from "../utils/minioUpload.utils";
import { CHUNK_SIZE, completedPartNumbers, nextMissingPart, partCountFor, progressPct } from "../utils/resumeUpload.utils";
import { recordUpload } from "./metrics";

function serialize(file: {
  _id: unknown;
  originalName: string;
  size: number;
  mimeType: string;
  status: string;
  progress: number;
  partCount: number;
  chunkSize: number;
  parts: { partNumber: number }[];
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(file._id),
    originalName: file.originalName,
    size: file.size,
    mimeType: file.mimeType,
    status: file.status,
    progress: file.progress,
    partCount: file.partCount,
    chunkSize: file.chunkSize,
    completedParts: file.parts.map((p: { partNumber: number }) => p.partNumber),
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

export async function listFiles(req: Request, res: Response): Promise<void> {
  const shares = await Share.find({ user: req.user!.id });
  const ids = shares.map((s) => s.file);
  const files = await FileModel.find({ _id: { $in: ids } });
  const roleByFile = new Map(shares.map((s) => [String(s.file), s.role]));
  res.json({
    files: files.map((f) => ({ ...serialize(f), role: roleByFile.get(String(f._id)) })),
  });
}

export async function initUpload(req: Request, res: Response): Promise<void> {
  const { filename, size, mimeType } = req.body as {
    filename?: string;
    size?: number;
    mimeType?: string;
  };
  if (!filename || !size || size <= 0) {
    res.status(400).json({ error: "filename and size required" });
    return;
  }

  const chunkSize = CHUNK_SIZE;
  const partCount = partCountFor(size, chunkSize);
  const key = `${req.user!.id}/${randomUUID()}/${filename}`;
  const uploadId = await startMultipart(key, mimeType || "application/octet-stream");

  const file = await FileModel.create({
    owner: req.user!.id,
    originalName: filename,
    key,
    uploadId,
    size,
    mimeType: mimeType || "application/octet-stream",
    chunkSize,
    partCount,
    status: "pending",
    parts: [],
    progress: 0,
  });
  await Share.create({ file: file._id, user: req.user!.id, role: "owner" });
  await emitAppEvent(valkeyPub, EventNames.FileStatusChanged, {
    fileId: String(file._id),
    status: file.status,
  });
  res.status(201).json(serialize(file));
}

export async function getPartUrl(req: Request, res: Response): Promise<void> {
  const file = await FileModel.findById(req.fileDoc!._id);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const partNumber = Number(req.params.partNumber ?? req.body.partNumber);
  if (file.parts.some((p) => p.partNumber === partNumber)) {
    res.json({ skipped: true, partNumber });
    return;
  }
  if (file.status === "pending" || file.status === "interrupted") {
    file.status = "uploading";
    await file.save();
    await emitAppEvent(valkeyPub, EventNames.FileStatusChanged, {
      fileId: String(file._id),
      status: file.status,
    });
  }
  const url = await presignPart(file.key, file.uploadId, partNumber);
  res.json({ url, partNumber, chunkSize: file.chunkSize });
}

export async function completePart(req: Request, res: Response): Promise<void> {
  const { partNumber, etag, size } = req.body as { partNumber: number; etag?: string; size?: number };
  if (!etag) {
    res.status(400).json({ error: "etag required" });
    return;
  }
  const file = await FileModel.findById(req.fileDoc!._id);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  if (!file.parts.some((p) => p.partNumber === partNumber)) {
    const tag = `"${etag.replaceAll('"', "")}"`;
    file.parts.push({ partNumber, etag: tag, size: Number(size ?? file.chunkSize) });
  }
  file.progress = progressPct(file.parts, file.size);
  file.status = "uploading";
  await file.save();
  await emitAppEvent(valkeyPub, EventNames.UploadProgress, {
    fileId: String(file._id),
    progress: file.progress,
    partNumber,
  });
  res.json(serialize(file));
}

export async function resumeUpload(req: Request, res: Response): Promise<void> {
  const file = await FileModel.findById(req.fileDoc!._id);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  if (file.status === "uploading" || file.status === "pending") {
    file.status = file.parts.length ? "interrupted" : "pending";
    await file.save();
  }
  res.json({
    ...serialize(file),
    completedParts: completedPartNumbers(file.parts),
    nextPart: nextMissingPart(file.parts, file.partCount),
  });
}

export async function completeUpload(req: Request, res: Response): Promise<void> {
  const file = await FileModel.findById(req.fileDoc!._id);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const started = Date.now();
  try {
    if (file.parts.length !== file.partCount) {
      res.status(400).json({ error: "Not all parts uploaded", nextPart: nextMissingPart(file.parts, file.partCount) });
      return;
    }
    await completeMultipart(file.key, file.uploadId, file.parts);
    file.status = "available";
    file.progress = 100;
    await file.save();
    await recordUpload(true, file.size, Date.now() - started);
    await emitAppEvent(valkeyPub, EventNames.FileUploaded, {
      fileId: String(file._id),
      size: file.size,
    });
    await emitAppEvent(valkeyPub, EventNames.FileStatusChanged, {
      fileId: String(file._id),
      status: file.status,
    });
    res.json(serialize(file));
  } catch (err) {
    file.status = "failed";
    await file.save();
    await recordUpload(false, 0, 0);
    await emitAppEvent(valkeyPub, EventNames.FileStatusChanged, {
      fileId: String(file._id),
      status: "failed",
    });
    res.status(500).json({ error: err instanceof Error ? err.message : "complete failed" });
  }
}

export async function abortUpload(req: Request, res: Response): Promise<void> {
  const file = await FileModel.findById(req.fileDoc!._id);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  if (file.status !== "available") {
    await abortMultipart(file.key, file.uploadId).catch(() => undefined);
    file.status = "failed";
    await file.save();
    await recordUpload(false, 0, 0);
    await emitAppEvent(valkeyPub, EventNames.FileStatusChanged, {
      fileId: String(file._id),
      status: file.status,
    });
  }
  res.json(serialize(file));
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  const file = await FileModel.findById(req.fileDoc!._id);
  if (!file || file.status !== "available") {
    res.status(409).json({ error: "File not available" });
    return;
  }
  const url = await presignDownload(file.key, file.originalName);
  res.json({ url });
}

export async function markInterrupted(req: Request, res: Response): Promise<void> {
  const file = await FileModel.findById(req.fileDoc!._id);
  if (!file || file.status === "available") {
    res.json({ ok: true });
    return;
  }
  file.status = "interrupted";
  await file.save();
  await emitAppEvent(valkeyPub, EventNames.UploadInterrupted, {
    fileId: String(file._id),
  });
  await emitAppEvent(valkeyPub, EventNames.FileStatusChanged, {
    fileId: String(file._id),
    status: file.status,
  });
  res.json(serialize(file));
}
