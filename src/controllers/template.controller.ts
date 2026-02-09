import { Response } from "express";
import { prisma } from "../prisma";
import { AuthedRequest } from "../middleware/auth";
import { validateBody } from "../utils/validate";
import { createTemplateSchema, updateTemplateSchema } from "../validators/template.schema";

export async function createTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const body = validateBody(createTemplateSchema, req.body);

  const template = await prisma.template.create({
    data: {
      ownerId: userId,
      name: body.name,
      texts: {
        create: body.texts.map(t => ({ key: t.key, text: t.text }))
      }
    },
    include: { texts: true }
  });

  res.json({ ok: true, template });
}

export async function listTemplates(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;

  const templates = await prisma.template.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { texts: true, _count: { select: { bots: true } } }
  });

  res.json({ ok: true, templates });
}

export async function getTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = Number(req.params.id);

  const template = await prisma.template.findFirst({
    where: { id, ownerId: userId },
    include: { texts: true, _count: { select: { bots: true } } }
  });

  if (!template) {
    const err: any = new Error("Template not found");
    err.status = 404;
    throw err;
  }

  res.json({ ok: true, template });
}

export async function updateTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  const body = validateBody(updateTemplateSchema, req.body);

  const exists = await prisma.template.findFirst({ where: { id, ownerId: userId } });
  if (!exists) {
    const err: any = new Error("Template not found");
    err.status = 404;
    throw err;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.template.update({
      where: { id },
      data: { name: body.name ?? undefined }
    });

    if (body.texts) {
      for (const item of body.texts) {
        await tx.templateText.upsert({
          where: { templateId_key: { templateId: id, key: item.key } },
          create: { templateId: id, key: item.key, text: item.text },
          update: { text: item.text }
        });
      }
    }

    const full = await tx.template.findUnique({
      where: { id },
      include: { texts: true }
    });

    return { ...t, texts: full?.texts ?? [] };
  });

  res.json({ ok: true, template: updated });
}

export async function deleteTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = Number(req.params.id);

  const exists = await prisma.template.findFirst({ where: { id, ownerId: userId } });
  if (!exists) {
    const err: any = new Error("Template not found");
    err.status = 404;
    throw err;
  }

  // Safety: agar botlar bog‘langan bo‘lsa, o‘chirmaymiz (xohlasangiz majburan ham qilamiz)
  const botsCount = await prisma.bot.count({ where: { templateId: id, ownerId: userId } });
  if (botsCount > 0) {
    const err: any = new Error("Template is used by bots. Change bots template first.");
    err.status = 409;
    throw err;
  }

  await prisma.template.delete({ where: { id } });
  res.json({ ok: true });
}
