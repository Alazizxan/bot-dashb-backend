import { z } from "zod";

// ✅ Add bot: token ham, templateId ham MAJBURIY
export const createBotSchema = z.object({
  templateId: z.number().int().positive(),
  token: z.string().min(10)
});

// (ixtiyoriy) tokenni keyin update qilish route'ini qoldirmoqchi bo‘lsangiz:
export const setBotTokenSchema = z.object({
  token: z.string().min(10)
});

export const setBotTemplateSchema = z.object({
  templateId: z.number().int().positive()
});

export const setBotActiveSchema = z.object({
  isActive: z.boolean()
});
