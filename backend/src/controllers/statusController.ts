import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { pingMongo } from "../config/mongo.config";
import { pingStorage } from "../config/minio.config";
import { User } from "../models/User";
import { clearAuthCookie, setAuthCookie, signToken } from "../middleware/auth.middleware";
import { readMetrics, recordLatency } from "./metrics";

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password || password.length < 6) {
    res.status(400).json({ error: "email and password (min 6) required" });
    return;
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(409).json({ error: "Email in use" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: email.toLowerCase(), passwordHash });
  const token = signToken({ id: String(user._id), email: user.email });
  setAuthCookie(res, token);
  res.status(201).json({ id: String(user._id), email: user.email });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({ id: String(user._id), email: user.email });
  setAuthCookie(res, token);
  res.json({ id: String(user._id), email: user.email });
}

export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export function me(req: Request, res: Response): void {
  res.json({ id: req.user!.id, email: req.user!.email });
}

export async function metrics(_req: Request, res: Response): Promise<void> {
  const t0 = Date.now();
  const [postgres, storage] = await Promise.all([pingMongo(), pingStorage()]);
  await recordLatency(Date.now() - t0);
  const data = await readMetrics();
  res.json({
    ...data,
    postgres,
    storage,
    pid: process.pid,
  });
}
