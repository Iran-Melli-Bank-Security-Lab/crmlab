import { Router } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import { requirePermission } from "@/middlewares/permission.middleware";
import { PERMISSIONS } from "@/constants/permissions";
import { sendSuccess } from "@/utils/response";
const router = Router();
router.use(requireAuth);
router.get(ROUTES.ROOT, requirePermission(PERMISSIONS.REPRESENTATIVE_TICKETS_READ), (_req, res) => sendSuccess(res, []));
router.post(ROUTES.ROOT, requirePermission(PERMISSIONS.REPRESENTATIVE_TICKETS_CREATE), (req, res) =>
  sendSuccess(res, req.body, HTTP_STATUS.CREATED)
);
router.patch(ROUTES.TICKETS.STATUS, requirePermission(PERMISSIONS.REPRESENTATIVE_TICKETS_UPDATE), (req, res) =>
  sendSuccess(res, { id: req.params.id, ...req.body })
);
export default router;
