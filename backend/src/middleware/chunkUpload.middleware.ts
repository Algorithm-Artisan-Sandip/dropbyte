import type { NextFunction, Request, Response } from "express";

export function chunkUpload(req: Request, res: Response, next: NextFunction): void {
  const file = req.fileDoc;
  if (!file) {
    res.status(400).json({ error: "File context missing" });
    return;
  }
  if (file.status === "available") {
    res.status(409).json({ error: "Upload already complete" });
    return;
  }

  const partNumber = Number(req.params.partNumber ?? req.body.partNumber ?? req.query.partNumber);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > file.partCount) {
    res.status(400).json({ error: "Invalid part number" });
    return;
  }

  const done = file.parts.some((p: { partNumber: number }) => p.partNumber === partNumber);
  if (done && req.method !== "GET") {
    res.status(200).json({ skipped: true, partNumber });
    return;
  }

  req.body = { ...(req.body ?? {}), partNumber };
  next();
}
