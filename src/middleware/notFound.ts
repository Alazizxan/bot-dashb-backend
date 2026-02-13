import { Request, Response, NextFunction } from "express";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  const err: any = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  err.code = "ROUTE_NOT_FOUND";
  next(err);
}
