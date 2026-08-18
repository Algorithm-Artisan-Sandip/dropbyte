import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { JwtPayload } from "../types";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    secure: env.nodeEnv === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.cookieName, {
    path: "/",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    secure: env.nodeEnv === "production",
  });
}

function readUser(req: Request): JwtPayload | undefined {
  const token = req.cookies?.[env.cookieName] as string | undefined;
  if (!token) return undefined;
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    return undefined;
  }
}

export function authOptional(req: Request, _res: Response, next: NextFunction): void {
  req.user = readUser(req);
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = readUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}
