import { Response } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../prisma";
import { AuthedRequest } from "../middleware/auth";

const STORAGE_ROOT_RAW = process.env.STORAGE_ROOT;
if (!STORAGE_ROOT_RAW) {
  console.warn("⚠️ STORAGE_ROOT env not set. Falling back to ./storage");
}
const STORAGE_ROOT = path.resolve(STORAGE_ROOT_RAW || path.join(process.cwd(), "storage"));


function safeJoin(base: string, rel: string) {
  const resolved = path.resolve(base, rel);
  if (!resolved.startsWith(base + path.sep)) {
    const err: any = new Error("Invalid path");
    err.status = 400;
    throw err;
  }
  return resolved;
}

export async function downloadSessionFile(req: AuthedRequest, res: Response) {
  const ownerId = req.user!.id;
  const sessionId = Number(req.params.id);

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid session id" });
  }

  // ✅ Owner check: session faqat o‘z botlariga tegishli bo‘lsa chiqadi
  const s = await prisma.session.findFirst({
    where: { id: sessionId, bot: { ownerId } },
    select: { id: true, botId: true, userId: true },
  });

  if (!s) return res.status(404).json({ ok: false, error: "Session not found" });

  // userId BigInt bo‘lishi mumkin → stringga
  const tgUserId = typeof s.userId === "bigint" ? s.userId.toString() : String(s.userId);

  // ✅ file: storage/owners/{ownerId}/bots/{botId}/sessions/{userId}.session
  const rel = path.join(
    "owners",
    String(ownerId),
    "bots",
    String(s.botId),
    "sessions",
    `${tgUserId}.session`
  );

  const filePath = safeJoin(STORAGE_ROOT, rel);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: "Session file not found on disk" });
  }

  const downloadName = `bot${s.botId}_user${tgUserId}.session`;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);

  return res.sendFile(filePath);
}
