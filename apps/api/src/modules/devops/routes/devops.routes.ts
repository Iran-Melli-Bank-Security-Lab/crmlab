import { Router } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import { requirePermission } from "@/middlewares/permission.middleware";
import { PERMISSIONS } from "@/constants/permissions";
import { sendSuccess } from "@/utils/response";
const router = Router();
router.use(requireAuth);
router.get(ROUTES.DEVOPS.DEPLOYMENTS, requirePermission(PERMISSIONS.DEVOPS_DEPLOYMENTS_READ), (_req, res) =>
  sendSuccess(res, [])
);
router.post(ROUTES.DEVOPS.DEPLOYMENTS, requirePermission(PERMISSIONS.DEVOPS_DEPLOYMENTS_CREATE), (req, res) =>
  sendSuccess(res, req.body, HTTP_STATUS.CREATED)
);
router.get(ROUTES.DEVOPS.SERVERS, requirePermission(PERMISSIONS.DEVOPS_SERVERS_READ), (_req, res) => sendSuccess(res, []));
export default router;
