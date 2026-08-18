import type { NextFunction, Request, Response } from "express";
import { valkeyPub } from "../config/valkey.config";
import { EventNames, emitAppEvent } from "../events/eventEmitter";
import { AccessLog } from "../models/AccessLog";
import { FileModel } from "../models/File";
import { Share } from "../models/Share";
import type { Permission } from "../types";
import { can, permissionsFor } from "../utils/policyChecker.utils";

export function checkFileAccessPolicy(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const fileId = req.params.id ?? req.params.fileId ?? req.body.fileId;
      if (!fileId) {
        res.status(400).json({ error: "file id required" });
        return;
      }

      const file = await FileModel.findById(fileId);
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const share = await Share.findOne({ file: String(file._id), user: req.user.id });
      const allowed = Boolean(share && can(share.role, permission));

      await AccessLog.create({
        file: String(file._id),
        user: req.user.id,
        action: permission,
        allowed,
      });
      await emitAppEvent(valkeyPub, EventNames.FileAccessAttempted, {
        fileId: String(file._id),
        userId: req.user.id,
        permission,
        allowed,
      });

      if (!allowed) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      req.fileDoc = {
        _id: file._id,
        owner: file.owner,
        originalName: file.originalName,
        key: file.key,
        uploadId: file.uploadId,
        size: file.size,
        mimeType: file.mimeType,
        chunkSize: file.chunkSize,
        partCount: file.partCount,
        status: file.status,
        parts: file.parts,
      };
      req.accessPolicy = { role: share!.role, permissions: permissionsFor(share!.role) };
      next();
    } catch (err) {
      next(err);
    }
  };
}
