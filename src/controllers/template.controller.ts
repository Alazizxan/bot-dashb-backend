import { Prisma } from "@prisma/client";
import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../prisma";
import { validateBody } from "../utils/validate";
import { TemplateCreateSchema, updateTemplateSchema } from "../validators/template.schema";

function asId(param: any) {
  const id = Number(param);
  if (!Number.isFinite(id) || id <= 0) {
    const err: any = new Error("Invalid id");
    err.status = 400;
    throw err;
  }
  return id;
}




function prismaNameConflict(res: Response) {
  return res.status(409).json({
    ok: false,
    code: "TEMPLATE_NAME_TAKEN",
    message: "Bu nom bilan shablon allaqachon mavjud. Boshqa nom tanlang.",
  });
}

function notFound(message = "Template not found") {
  const err: any = new Error(message);
  err.status = 404;
  return err;
}

/**
 * POST /api/templates
 * Create new template (strict create)
 */
export async function createTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const body = validateBody(TemplateCreateSchema, req.body);

  const userExists = await prisma.user.findUnique({ where: { id: userId } });
  if (!userExists) {
    return res.status(401).json({
      ok: false,
      code: "AUTH_STALE_TOKEN",
      message: "Session eskirgan. Qayta login qiling.",
    });
  }



  try {
    const template = await prisma.template.create({
      data: {
        ownerId: userId,
        name: body.name,
        texts: {
          create: body.texts.map((t: any) => ({ key: t.key, text: t.text })),
        },
      },
      include: { texts: true },
    });

    return res.json({ ok: true, template });
  } catch (e: any) {
    // Unique constraint failed (ownerId, name)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return prismaNameConflict(res);
    }
    throw e;
  }
}

/**
 * GET /api/templates
 */
export async function listTemplates(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;

  const templates = await prisma.template.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { texts: true, _count: { select: { bots: true } } },
  });

  return res.json({ ok: true, templates });
}

/**
 * GET /api/templates/:id
 */
export async function getTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = asId(req.params.id);

  const template = await prisma.template.findFirst({
    where: { id, ownerId: userId },
    include: { texts: true, _count: { select: { bots: true } } },
  });

  if (!template) throw notFound();
  return res.json({ ok: true, template });
}

/**
 * PATCH /api/templates/:id
 * Update name and/or texts
 */
export async function updateTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = asId(req.params.id);
  const body = validateBody(updateTemplateSchema, req.body);

  // exists + owner check
  const exists = await prisma.template.findFirst({ where: { id, ownerId: userId } });
  if (!exists) throw notFound();

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1) update name (optional)
      if (typeof body.name === "string") {
        await tx.template.update({
          where: { id },
          data: { name: body.name },
        });
      }

      // 2) update texts (optional)
      if (body.texts) {
        // ✅ Production: “toza” sync (old texts -> replace)
        await tx.templateText.deleteMany({ where: { templateId: id } });

        // createMany bo‘lsa tezroq, lekin sqlite/pg ga qarab qo‘llab-quvvatlanadi.
        // createMany ishlatsangiz duplicate bo‘lsa yiqiladi — bu yaxshi.
        await tx.templateText.createMany({
          data: body.texts.map((t: any) => ({
            templateId: id,
            key: t.key,
            text: t.text,
          })),
        });

        // --- Agar deleteMany+createMany o‘rniga incremental upsert xohlasangiz:
        // for (const item of body.texts) {
        //   await tx.templateText.upsert({
        //     where: { templateId_key: { templateId: id, key: item.key } },
        //     create: { templateId: id, key: item.key, text: item.text },
        //     update: { text: item.text },
        //   });
        // }
      }

      // 3) return full
      const full = await tx.template.findFirst({
        where: { id, ownerId: userId },
        include: { texts: true },
      });

      if (!full) throw notFound(); // juda kam ehtimol
      return full;
    });

    return res.json({ ok: true, template: updated });
  } catch (e: any) {
    // Unique name collision
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return prismaNameConflict(res);
    }
    // Record not found (rare)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw notFound();
    }
    throw e;
  }
}

/**
 * DELETE /api/templates/:id
 */
export async function deleteTemplate(req: AuthedRequest, res: Response) {
  const userId = req.user!.id;
  const id = asId(req.params.id);

  const exists = await prisma.template.findFirst({ where: { id, ownerId: userId } });
  if (!exists) throw notFound();

  // Safety: template botlarga ulangan bo‘lsa, o‘chirmaymiz
  const botsCount = await prisma.bot.count({ where: { templateId: id, ownerId: userId } });
  if (botsCount > 0) {
    return res.status(409).json({
      ok: false,
      code: "TEMPLATE_IN_USE",
      message: "Template botlar tomonidan ishlatilmoqda. Avval botlardan template’ni o‘zgartiring.",
    });
  }

  await prisma.template.delete({ where: { id } });
  return res.json({ ok: true });
}
