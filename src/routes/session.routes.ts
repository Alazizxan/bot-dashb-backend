import { Router } from "express";
import { auth } from "../middleware/auth";
import { listSessions, getSession } from "../controllers/session.controller";
import { downloadSessionFile } from "../controllers/session_files.controller";


const r = Router();

r.get("/", auth, listSessions);
r.get("/:id", auth, getSession);
r.get("/:id/download", auth, downloadSessionFile);

export default r;
