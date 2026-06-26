import { Router } from "express";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import { requireAnyPermission, requirePermission } from "@/middlewares/permission.middleware";
import { requireProjectAccess } from "@/middlewares/projectAccess.middleware";
import { PERMISSIONS } from "@/constants/permissions";
import { validate } from "@/middlewares/validate.middleware";
import { assignUsersSchema, createProjectSchema } from "../validators/project.validators";
import {
  assignUsersToProject,
  createProject,
  getEligibleProjectAssignees,
  getProjects,
} from "../controllers/project.controller";

const router = Router();

router.use(requireAuth);
router.get(
  ROUTES.ROOT,
  requireAnyPermission(
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.QUALITY_PROJECTS_READ
  ),
  getProjects
);
router.post(ROUTES.ROOT, requirePermission(PERMISSIONS.ADMIN_PROJECTS_CREATE), validate(createProjectSchema), createProject);
router.get(
  ROUTES.PROJECTS.ELIGIBLE_ASSIGNEES,
  requireProjectAccess("params.id"),
  requireAnyPermission(PERMISSIONS.SECURITY_PROJECTS_ASSIGN, PERMISSIONS.QUALITY_PROJECTS_ASSIGN),
  getEligibleProjectAssignees
);
router.post(
  ROUTES.PROJECTS.ASSIGN_USERS,
  requireProjectAccess("params.id"),
  requireAnyPermission(PERMISSIONS.SECURITY_PROJECTS_ASSIGN, PERMISSIONS.QUALITY_PROJECTS_ASSIGN),
  validate(assignUsersSchema),
  assignUsersToProject
);

export default router;
