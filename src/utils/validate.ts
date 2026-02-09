import { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
    const err: any = new Error(msg);
    err.status = 400;
    throw err;
  }
  return parsed.data;
}
