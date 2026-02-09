import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../prisma";

export async function dashboard(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;

  const [botsCount, templatesCount] = await Promise.all([
    prisma.bot.count({ where: { ownerId: userId } }),
    prisma.template.count({ where: { ownerId: userId } })
  ]);

  const bots = await prisma.bot.findMany({
    where: { ownerId: userId },
    include: { template: true, _count: { select: { sessions: true } } }
  });

  // total sessions + total unique telegram users across all bots
  const botIds = bots.map(b => b.id);
  const totalSessions = await prisma.session.count({ where: { botId: { in: botIds } } });

  const uniqUsers = await prisma.session.groupBy({
    by: ["userId"],
    where: { botId: { in: botIds } }
  });

  res.json({
    ok: true,
    summary: {
      botsCount,
      templatesCount,
      totalSessions,
      totalUniqueUsers: uniqUsers.length
    },
    bots: bots.map(b => ({
      id: b.id,
      isActive: b.isActive,
      hasToken: Boolean(b.token),
      templateId: b.templateId,
      templateName: b.template?.name ?? null,
      sessions: b._count.sessions
    }))
  });
}
