import { Router } from "express";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import {
  requireAnyPermission,
  requirePermission,
} from "@/middlewares/permission.middleware";
import {
  requireProjectAccess,
  requireProjectCapability,
} from "@/middlewares/projectAccess.middleware";
import { PERMISSIONS } from "@/constants/permissions";
import { validate } from "@/middlewares/validate.middleware";
import {
  assignUsersSchema,
  createProjectSchema,
  projectSecurityScopeSchema,
} from "../validators/project.validators";
import {
  assignUsersToProject,
  createProject,
  getEligibleProjectAssignees,
  getProject,
  getProjectSecurityScope,
  getProjectSecurityStandards,
  getProjectPentesterScopes,
  getProjects,
  putProjectSecurityScope,
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
router.post(
  ROUTES.ROOT,
  requirePermission(PERMISSIONS.ADMIN_PROJECTS_CREATE),
  validate(createProjectSchema),
  createProject
);
router.get(
  "/:id/security-standards",
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_ASSIGN,
    PERMISSIONS.PENTEST_PROJECTS_READ
  ),
  getProjectSecurityStandards
);
router.get(
  "/:id/security-scope",
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_ASSIGN
  ),
  getProjectSecurityScope
);
router.put(
  "/:id/security-scope",
  requirePermission(PERMISSIONS.SECURITY_PROJECTS_ASSIGN),
  requireProjectCapability("assign-pentesters", "params.id"),
  validate(projectSecurityScopeSchema),
  putProjectSecurityScope
);
router.get(
  "/:id/pentester-scopes",
  requirePermission(PERMISSIONS.SECURITY_PROJECTS_ASSIGN),
  requireProjectCapability("assign-pentesters", "params.id"),
  getProjectPentesterScopes
);
router.get(
  ROUTES.PARAM_ID,
  requireAnyPermission(
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.QUALITY_PROJECTS_READ
  ),
  requireProjectAccess("params.id"),
  getProject
);
router.get(
  ROUTES.PROJECTS.ELIGIBLE_ASSIGNEES,
  requireAnyPermission(
    PERMISSIONS.SECURITY_PROJECTS_ASSIGN,
    PERMISSIONS.QUALITY_PROJECTS_ASSIGN
  ),
  requireProjectCapability("assign-project-members", "params.id"),
  getEligibleProjectAssignees
);
router.post(
  ROUTES.PROJECTS.ASSIGN_USERS,
  requireAnyPermission(
    PERMISSIONS.SECURITY_PROJECTS_ASSIGN,
    PERMISSIONS.QUALITY_PROJECTS_ASSIGN
  ),
  requireProjectCapability("assign-project-members", "params.id"),
  validate(assignUsersSchema),
  assignUsersToProject
);

export default router;
