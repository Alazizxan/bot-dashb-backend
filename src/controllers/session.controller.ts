import { Response } from "express";
import { prisma } from "../prisma";
import { AuthedRequest } from "../middleware/auth";
import type { Prisma } from "@prisma/client";

const toInt = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toBool = (v: any) => (v === "true" ? true : v === "false" ? false : null);

export async function listSessions(req: AuthedRequest, res: Response) {
  const ownerId = req.user!.id;

  const botId = toInt(req.query.botId);
  const userId = toInt(req.query.userId); // telegram userId (number/bigint bo‘lishi mumkin)
  const isAuthed = toBool(req.query.isAuthed);
  const q = (req.query.q as string | undefined)?.trim() ?? "";

  const take = Math.min(Math.max(toInt(req.query.take) ?? 50, 1), 200);
  const skip = Math.max(toInt(req.query.skip) ?? 0, 0);

  const where: Prisma.SessionWhereInput = {
    bot: { ownerId },
    ...(botId ? { botId } : {}),
    ...(userId ? { userId } : {}), // ✅ equals
    ...(isAuthed !== null ? { isAuthed } : {}),
    ...(q
      ? {
          OR: [
            { phone: { contains: q } },
            { path: { contains: q } },
          ],
        }
      : {}),
  };

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { updatedAt: "desc" }, // ✅ schema’da bo‘lsa
      skip,
      take,
      select: {
        id: true,
        botId: true,
        userId: true,
        phone: true,
        path: true,
        isAuthed: true,
        createdAt: true,
        updatedAt: true,
        bot: {
          select: {
            id: true,
            templateId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.session.count({ where }),
  ]);

  return res.json({ ok: true, sessions, page: { total, skip, take } });
}

export async function getSession(req: AuthedRequest, res: Response) {
  const ownerId = req.user!.id;
  const id = Number(req.params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }

  const session = await prisma.session.findFirst({
    where: { id, bot: { ownerId } },
    select: {
      id: true,
      botId: true,
      userId: true,
      phone: true,
      path: true,
      isAuthed: true,
      createdAt: true,
      updatedAt: true,
      bot: {
        select: {
          id: true,
          templateId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!session) return res.status(404).json({ ok: false, message: "Session not found" });
  return res.json({ ok: true, session });
}
