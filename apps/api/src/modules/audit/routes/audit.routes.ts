import { Router } from "express";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import { requirePermission, requireRole } from "@/middlewares/permission.middleware";
import { ROLES } from "@/constants/roles";
import { validate } from "@/middlewares/validate.middleware";
import { getAuditLogDetails, getAuditLogs } from "../controllers/audit.controller";
import { auditLogDetailSchema, auditLogListSchema } from "../validators/audit.validators";

const router = Router();

router.use(requireAuth);
router.get(
  ROUTES.ROOT,
  requireRole(ROLES.ADMIN),
  requirePermission(PERMISSIONS.ADMIN_AUDIT_READ),
  validate(auditLogListSchema),
  getAuditLogs
);
router.get(
  ROUTES.AUDIT_LOGS.DETAIL,
  requireRole(ROLES.ADMIN),
  requirePermission(PERMISSIONS.ADMIN_AUDIT_READ),
  validate(auditLogDetailSchema),
  getAuditLogDetails
);

export default router;
