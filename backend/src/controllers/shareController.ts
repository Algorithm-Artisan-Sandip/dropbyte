import type { Request, Response } from "express";
import { FileModel } from "../models/File";
import { Share } from "../models/Share";
import { User } from "../models/User";
import type { ShareRole } from "../types";

const ROLES: ShareRole[] = ["owner", "viewer", "editor", "collaborator"];

export async function createShare(req: Request, res: Response): Promise<void> {
  const { fileId, email, role } = req.body as { fileId?: string; email?: string; role?: ShareRole };
  if (!fileId || !email || !role || !ROLES.includes(role)) {
    res.status(400).json({ error: "fileId, email, and role required" });
    return;
  }
  if (role === "owner") {
    res.status(400).json({ error: "Cannot grant owner" });
    return;
  }

  const file = await FileModel.findById(fileId);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const ownerShare = await Share.findOne({ file: file._id, user: req.user!.id, role: "owner" });
  if (!ownerShare) {
    res.status(403).json({ error: "Only owner can share" });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (String(user._id) === String(file.owner)) {
    res.status(400).json({ error: "Owner already has access" });
    return;
  }

  const share = await Share.findOneAndUpdate(
    { file: file._id, user: user._id },
    { role },
    { new: true, upsert: true },
  );
  res.status(201).json({
    id: String(share._id),
    fileId: String(file._id),
    email: user.email,
    role: share.role,
  });
}

export async function listShares(req: Request, res: Response): Promise<void> {
  const fileId = String(req.query.fileId ?? "");
  if (!fileId) {
    res.status(400).json({ error: "fileId required" });
    return;
  }
  const ownerShare = await Share.findOne({ file: fileId, user: req.user!.id, role: "owner" });
  if (!ownerShare) {
    res.status(403).json({ error: "Only owner can list shares" });
    return;
  }
  const shares = await Share.find({ file: fileId });
  res.json({
    shares: shares.map((s) => {
      const u = s.user as unknown as { email: string };
      return { id: String(s._id), email: u.email, role: s.role };
    }),
  });
}

export async function updateShare(req: Request, res: Response): Promise<void> {
  const { role } = req.body as { role?: ShareRole };
  if (!role || !ROLES.includes(role) || role === "owner") {
    res.status(400).json({ error: "valid role required" });
    return;
  }
  const share = await Share.findById(req.params.id);
  if (!share) {
    res.status(404).json({ error: "Share not found" });
    return;
  }
  const ownerShare = await Share.findOne({ file: share.file, user: req.user!.id, role: "owner" });
  if (!ownerShare) {
    res.status(403).json({ error: "Only owner can update shares" });
    return;
  }
  if (share.role === "owner") {
    res.status(400).json({ error: "Cannot change owner share" });
    return;
  }
  share.role = role;
  await share.save();
  res.json({ id: String(share._id), role: share.role });
}

export async function deleteShare(req: Request, res: Response): Promise<void> {
  const share = await Share.findById(req.params.id);
  if (!share) {
    res.status(404).json({ error: "Share not found" });
    return;
  }
  const ownerShare = await Share.findOne({ file: share.file, user: req.user!.id, role: "owner" });
  if (!ownerShare) {
    res.status(403).json({ error: "Only owner can revoke shares" });
    return;
  }
  if (share.role === "owner") {
    res.status(400).json({ error: "Cannot revoke owner" });
    return;
  }
  await share.deleteOne();
  res.json({ ok: true });
}
