import { z } from "zod";

const allowedKeys = ["start", "phone_request", "code_request", "success", "error", "retry"] as const;

export const createTemplateSchema = z.object({
  name: z.string().min(2).max(60),
  texts: z.array(
    z.object({
      key: z.enum(allowedKeys),
      text: z.string().min(1).max(4000)
    })
  ).min(1)
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  texts: z.array(
    z.object({
      key: z.enum(allowedKeys),
      text: z.string().min(1).max(4000)
    })
  ).optional()
});
