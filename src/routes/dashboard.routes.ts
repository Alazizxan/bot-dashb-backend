import { Router } from "express";
import { auth } from "../middleware/auth";
import { dashboard } from "../controllers/dashboard.controller";

const r = Router();
r.use(auth);
r.get("/", dashboard);

export default r;
