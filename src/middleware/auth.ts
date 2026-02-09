import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";

export interface AuthedRequest extends Request {
  user?: { id: number; email: string };
}

export function auth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  const token = header.slice("Bearer ".length);

  try {
    const decoded = verifyJwt(token);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    const err: any = new Error("Invalid token");
    err.status = 401;
    throw err;
  }
}
