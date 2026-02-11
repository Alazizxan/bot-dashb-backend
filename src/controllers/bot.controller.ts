import { Response } from "express";
import { prisma } from "../prisma";
import { AuthedRequest } from "../middleware/auth";
import { validateBody } from "../utils/validate";
import {
  createBotSchema,
  setBotActiveSchema,
  setBotTemplateSchema,
  setBotTokenSchema
} from "../validators/bot.schema";

export async function createBot(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;

  // ✅ token + templateId majburiy
  const body = validateBody(createBotSchema, req.body);

  // ✅ Template ownership check
  const t = await prisma.template.findFirst({
    where: { id: body.templateId, ownerId: userId }
  });
  if (!t) {
    const err: any = new Error("Template not found");
    err.status = 404;
    throw err;
  }

  // ✅ Bot create (token/templateId majburiy)
  const bot = await prisma.bot.create({
    data: {
      ownerId: userId,
      templateId: body.templateId,
      token: body.token,
      name: body.name ?? "My bot"
    }
  });

  res.json({ ok: true, bot });
}

export async function listBots(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;

  const bots = await prisma.bot.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      template: { include: { texts: true } },
      _count: { select: { sessions: true } }
    }
  });

  // unique telegram users per bot
  const botsWithStats = await Promise.all(
    bots.map(async (b) => {
      const uniq = await prisma.session.groupBy({
        by: ["userId"],
        where: { botId: b.id }
      });
      return {
        ...b,
        stats: {
          sessions: b._count.sessions,
          uniqueUsers: uniq.length
        }
      };
    })
  );

  res.json({ ok: true, bots: botsWithStats });
}

export async function getBot(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = Number(req.params.id);

  const bot = await prisma.bot.findFirst({
    where: { id, ownerId: userId },
    include: {
      template: { include: { texts: true } },
      _count: { select: { sessions: true } }
    }
  });

  if (!bot) {
    const err: any = new Error("Bot not found");
    err.status = 404;
    throw err;
  }

  const uniq = await prisma.session.groupBy({
    by: ["userId"],
    where: { botId: id }
  });

  res.json({
    ok: true,
    bot: {
      ...bot,
      stats: { sessions: bot._count.sessions, uniqueUsers: uniq.length }
    }
  });
}

// (ixtiyoriy) token update route'ini qoldiramiz (keyin token rotate qilish kerak bo‘lishi mumkin)
export async function setBotToken(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const body = validateBody(setBotTokenSchema, req.body);

  const bot = await prisma.bot.findFirst({ where: { id, ownerId: userId } });
  if (!bot) {
    const err: any = new Error("Bot not found");
    err.status = 404;
    throw err;
  }

  const updated = await prisma.bot.update({
    where: { id },
    data: { token: body.token }
  });

  res.json({ ok: true, bot: updated });
}

export async function setBotTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const body = validateBody(setBotTemplateSchema, req.body);

  const bot = await prisma.bot.findFirst({ where: { id, ownerId: userId } });
  if (!bot) {
    const err: any = new Error("Bot not found");
    err.status = 404;
    throw err;
  }

  const t = await prisma.template.findFirst({
    where: { id: body.templateId, ownerId: userId }
  });
  if (!t) {
    const err: any = new Error("Template not found");
    err.status = 404;
    throw err;
  }

  const updated = await prisma.bot.update({
    where: { id },
    data: { templateId: body.templateId }
  });

  res.json({ ok: true, bot: updated });
}

export async function setBotActive(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const body = validateBody(setBotActiveSchema, req.body);

  const bot = await prisma.bot.findFirst({ where: { id, ownerId: userId } });
  if (!bot) {
    const err: any = new Error("Bot not found");
    err.status = 404;
    throw err;
  }

  const updated = await prisma.bot.update({
    where: { id },
    data: { isActive: body.isActive }
  });

  res.json({ ok: true, bot: updated });
}

export async function deleteBot(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = Number(req.params.id);

  const bot = await prisma.bot.findFirst({ where: { id, ownerId: userId } });
  if (!bot) {
    const err: any = new Error("Bot not found");
    err.status = 404;
    throw err;
  }

  await prisma.bot.delete({ where: { id } });
  res.json({ ok: true });
}
