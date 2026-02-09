import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate
} from "../controllers/template.controller";

const r = Router();

r.use(auth);
r.post("/", createTemplate);
r.get("/", listTemplates);
r.get("/:id", getTemplate);
r.put("/:id", updateTemplate);
r.delete("/:id", deleteTemplate);

export default r;
