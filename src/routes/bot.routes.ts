import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  createBot,
  deleteBot,
  getBot,
  listBots,
  setBotActive,
  setBotTemplate,
  setBotToken
} from "../controllers/bot.controller";

const r = Router();

r.use(auth);

r.post("/", createBot);
r.get("/", listBots);
r.get("/:id", getBot);

r.put("/:id/token", setBotToken);       // (ixtiyoriy, lekin foydali)
r.put("/:id/template", setBotTemplate);
r.put("/:id/active", setBotActive);

r.delete("/:id", deleteBot);

export default r;
