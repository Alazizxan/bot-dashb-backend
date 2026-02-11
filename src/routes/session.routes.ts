import { Router } from "express";
import { auth } from "../middleware/auth";
import { listSessions, getSession } from "../controllers/session.controller";

const r = Router();

r.get("/", auth, listSessions);
r.get("/:id", auth, getSession);

export default r;
