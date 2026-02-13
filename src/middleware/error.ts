import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

function isProd() {
  return process.env.NODE_ENV === "production";
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.status) || 500;

  // Prisma xatolari
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint
    if (err.code === "P2002") {
      return res.status(409).json({
        ok: false,
        code: "DB_UNIQUE_CONFLICT",
        message: "Bunday qiymat allaqachon mavjud.",
      });
    }

    // Foreign key
    if (err.code === "P2003") {
      return res.status(409).json({
        ok: false,
        code: "DB_FOREIGN_KEY",
        message: "Bog‘lanish xatosi (foreign key).",
      });
    }

    // Record not found
    if (err.code === "P2025") {
      return res.status(404).json({
        ok: false,
        code: "DB_NOT_FOUND",
        message: "Topilmadi.",
      });
    }

    // fallback
    console.error("[PRISMA]", err.code, err.message);
    return res.status(500).json({
      ok: false,
      code: "DB_ERROR",
      message: "Database xatosi.",
    });
  }

  // JSON parse error (express.json)
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      ok: false,
      code: "BAD_JSON",
      message: "JSON noto‘g‘ri formatda.",
    });
  }

  // Default log
  console.error("[ERROR]", {
    message: err?.message,
    status,
    stack: isProd() ? undefined : err?.stack,
  });

  return res.status(status).json({
    ok: false,
    code: err?.code || "INTERNAL_ERROR",
    message: err?.message || "Server xatosi",
    ...(isProd() ? {} : { stack: err?.stack }),
  });
}
