import { Request, Response, NextFunction } from "express";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  const err: any = new Error(`Not Found: ${req.method} ${req.path}`);
  err.status = 404;
  next(err);
}
