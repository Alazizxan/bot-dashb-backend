import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config";
import { errorHandler } from "./middleware/error";
import { notFound } from "./middleware/notFound";

import authRoutes from "./routes/auth.routes";
import templateRoutes from "./routes/template.routes";
import botRoutes from "./routes/bot.routes";
import dashboardRoutes from "./routes/dashboard.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/bots", botRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);
