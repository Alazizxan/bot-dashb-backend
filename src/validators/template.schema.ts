import { z } from "zod";
import { ALLOWED_KEYS } from "../constants/allowedKeys";

export const TemplateCreateSchema = z.object({
  name: z.string().min(1),
  texts: z.array(
    z.object({
      key: z.enum(ALLOWED_KEYS),
      text: z.string(),
    })
  ),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  texts: z.array(
    z.object({
      key: z.enum(ALLOWED_KEYS),
      text: z.string().min(1).max(4000)
    })
  ).optional()
});
