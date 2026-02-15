// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "../prisma";
import { validateBody } from "../utils/validate";
import { registerSchema, loginSchema } from "../validators/auth.schema";
import { hashPassword, comparePassword } from "../utils/hash";
import { signJwt } from "../utils/jwt";
import { config } from "../config";

const REFRESH_TTL_DAYS = 30;
const COOKIE_NAME = "rt"; // refresh token cookie nomi

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function makeRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/api/auth/refresh",
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}


function clearRefreshCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/api/auth/refresh" });
}

async function issueRefreshToken(userId: number, res: Response) {
  const rt = makeRefreshToken();
  const tokenHash = sha256(rt);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  res.cookie(COOKIE_NAME, rt, refreshCookieOptions());
}

function authResponse(user: { id: number; email: string; createdAt?: Date; userMarketLink?: string | null }) {
  const token = signJwt({ id: user.id, email: user.email });
  return {
    ok: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      userMarketLink: user.userMarketLink,
    },
  };
}

export async function register(req: Request, res: Response) {
  const body = validateBody(registerSchema, req.body);

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) {
    const err: any = new Error("Email already exists");
    err.status = 409;
    throw err;
  }

  // userMarketLink majburiy bo‘lsin (validator ham tekshiradi)
  const user = await prisma.user.create({
    data: {
      email: body.email,
      password: await hashPassword(body.password),
      userMarketLink: body.userMarketLink,
    },
    select: { id: true, email: true, createdAt: true, userMarketLink: true },
  });

  await issueRefreshToken(user.id, res);
  return res.json(authResponse(user));
}

export async function login(req: Request, res: Response) {
  const body = validateBody(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return res.status(401).json({ ok: false, message: "Invalid credentials" });
  }

  const ok = await comparePassword(body.password, user.password);
  if (!ok) {
    return res.status(401).json({ ok: false, message: "Invalid credentials" });
  }

  const token = signJwt({ id: user.id, email: user.email });

  return res.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt }
  });
}


/**
 * POST /api/auth/refresh
 * Cookie'dagi refresh token orqali yangi access token beradi.
 * ✅ Rotate: eski refresh token o‘chiriladi, yangisi beriladi.
 */
export async function refresh(req: Request, res: Response) {
  const rt = (req as any).cookies?.[COOKIE_NAME] as string | undefined;
  if (!rt) return res.status(401).json({ ok: false, error: "NO_REFRESH" });

  const tokenHash = sha256(rt);

  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true, tokenHash: true },
  });

  if (!row) {
    clearRefreshCookie(res);
    return res.status(401).json({ ok: false, error: "INVALID_REFRESH" });
  }

  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.refreshToken.delete({ where: { tokenHash } });
    clearRefreshCookie(res);
    return res.status(401).json({ ok: false, error: "REFRESH_EXPIRED" });
  }

  // rotate refresh token (transaction)
  const newRt = makeRefreshToken();
  const newHash = sha256(newRt);
  const newExpiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000);

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.delete({ where: { tokenHash } });
    await tx.refreshToken.create({
      data: { userId: row.userId, tokenHash: newHash, expiresAt: newExpiresAt },
    });
  });

  // yangi cookie
  res.cookie(COOKIE_NAME, newRt, refreshCookieOptions());

  // yangi access token
  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { id: true, email: true, createdAt: true, userMarketLink: true },
  });

  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ ok: false, error: "USER_NOT_FOUND" });
  }

  const token = signJwt({ id: user.id, email: user.email });
  return res.json({ ok: true, token });
}

/**
 * POST /api/auth/logout
 * Refresh tokenni DB’dan ham o‘chiradi va cookie’ni tozalaydi.
 */
export async function logout(req: Request, res: Response) {
  const rt = (req as any).cookies?.[COOKIE_NAME] as string | undefined;

  if (rt) {
    const tokenHash = sha256(rt);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  clearRefreshCookie(res);
  return res.json({ ok: true });
}

/**
 * (Ixtiyoriy) Prisma xatolarini chiroyli ushlash uchun helper.
 * Sizning global errorHandler’ingiz bor bo‘lsa shart emas.
 */
export function isPrismaKnownError(e: any, code: string) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
}
