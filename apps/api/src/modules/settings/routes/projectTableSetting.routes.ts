import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware";
import {
  getProjectTableSettings,
  getProjectTableColumns,
  resetProjectTableSettings,
  saveProjectTableSettings,
} from "../controllers/projectTableSetting.controller";

const router = Router();

router.use(requireAuth);
router.get("/project-table-columns", getProjectTableColumns);
router.get("/project-tables", getProjectTableSettings);
router.put("/project-tables/:context", saveProjectTableSettings);
router.delete("/project-tables/:context", resetProjectTableSettings);

export default router;
