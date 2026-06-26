import { Router } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import { requirePermission } from "@/middlewares/permission.middleware";
import { PERMISSIONS } from "@/constants/permissions";
import { sendSuccess } from "@/utils/response";
const router = Router();
router.use(requireAuth);
router.get(ROUTES.QA.TEST_CASES, requirePermission(PERMISSIONS.QA_TEST_CASES_READ), (_req, res) => sendSuccess(res, []));
router.post(ROUTES.QA.TEST_CASES, requirePermission(PERMISSIONS.QA_TEST_CASES_CREATE), (req, res) =>
  sendSuccess(res, req.body, HTTP_STATUS.CREATED)
);
router.patch(ROUTES.QA.TEST_CASE_STATUS, requirePermission(PERMISSIONS.QA_TEST_CASES_UPDATE), (req, res) =>
  sendSuccess(res, { id: req.params.id, ...req.body })
);
export default router;
