import { Router } from "express";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import {
  getSecurityStandardTree,
  listSecurityStandards,
} from "../controllers/securityStandard.controller";

const router = Router();

router.use(requireAuth);
router.get(ROUTES.ROOT, listSecurityStandards);
router.get(ROUTES.SECURITY_STANDARDS.BY_KEY_VERSION, getSecurityStandardTree);

export default router;
