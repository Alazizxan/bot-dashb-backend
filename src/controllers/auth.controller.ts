import { Request, Response } from "express";
import { prisma } from "../prisma";
import { validateBody } from "../utils/validate";
import { registerSchema, loginSchema } from "../validators/auth.schema";
import { hashPassword, comparePassword } from "../utils/hash";
import { signJwt } from "../utils/jwt";

export async function register(req: Request, res: Response) {
  const body = validateBody(registerSchema, req.body);

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) {
    const err: any = new Error("Email already exists");
    err.status = 409;
    throw err;
  }

  const user = await prisma.user.create({
    data: {
      email: body.email,
      password: await hashPassword(body.password)
    },
    select: { id: true, email: true, createdAt: true }
  });

  const token = signJwt({ id: user.id, email: user.email });

  res.json({ ok: true, token, user });
}

export async function login(req: Request, res: Response) {
  const body = validateBody(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    const err: any = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const ok = await comparePassword(body.password, user.password);
  if (!ok) {
    const err: any = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const token = signJwt({ id: user.id, email: user.email });

  res.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, createdAt: user.createdAt }
  });
}
