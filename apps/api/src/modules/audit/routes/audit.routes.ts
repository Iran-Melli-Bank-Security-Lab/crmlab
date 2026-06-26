import { Router } from "express";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import { requirePermission } from "@/middlewares/permission.middleware";
import { getAuditLogs } from "../controllers/audit.controller";

const router = Router();

router.use(requireAuth);
router.get(ROUTES.ROOT, requirePermission(PERMISSIONS.ADMIN_AUDIT_READ), getAuditLogs);

export default router;
