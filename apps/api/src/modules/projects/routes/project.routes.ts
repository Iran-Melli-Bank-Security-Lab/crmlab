import { Router } from "express";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import {
  requireAnyPermission,
  requirePermission,
} from "@/middlewares/permission.middleware";
import { requireProjectAccess } from "@/middlewares/projectAccess.middleware";
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
import {
  getProjectDevOpsInfo,
  putProjectDevOpsInfo,
} from "@/modules/devops/controllers/projectDevOpsInfo.controller";
import { projectDevOpsInfoSchema } from "@/modules/devops/validators/projectDevOpsInfo.validators";
import {
  createRuntimeInstance,
  createTestTarget,
  deleteRuntimeInstance,
  deleteTestTarget,
  listRuntimeInstances,
  listTestTargets,
  patchRuntimeInstance,
  patchTestTarget,
} from "@/modules/devops/controllers/devOpsResource.controller";
import {
  createRuntimeInstanceSchema,
  createTestTargetSchema,
  patchRuntimeInstanceSchema,
  patchTestTargetSchema,
  runtimeInstanceParamsSchema,
  testTargetParamsSchema,
} from "@/modules/devops/validators/devOpsResource.validators";
import {
  createCredentialGroup,
  deleteCredentialGroup,
  listCredentialGroups,
  patchCredentialGroup,
} from "@/modules/devops/controllers/devOpsCredentialGroup.controller";
import {
  createCredentialGroupSchema,
  credentialGroupParamsSchema,
  patchCredentialGroupSchema,
} from "@/modules/devops/validators/devOpsCredentialGroup.validators";
import {
  createMobileArtifact,
  deleteMobileArtifact,
  listMobileArtifacts,
  patchMobileArtifact,
} from "@/modules/devops/controllers/projectDevOpsArtifact.controller";
import {
  createMobileArtifactSchema,
  mobileArtifactParamsSchema,
  patchMobileArtifactSchema,
} from "@/modules/devops/validators/projectDevOpsArtifact.validators";

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
  "/:id/devops-info",
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.QUALITY_PROJECTS_READ
  ),
  getProjectDevOpsInfo
);
router.put(
  "/:id/devops-info",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(projectDevOpsInfoSchema),
  putProjectDevOpsInfo
);
router.get(
  "/:id/devops-info/instances",
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.QUALITY_PROJECTS_READ
  ),
  listRuntimeInstances
);
router.post(
  "/:id/devops-info/instances",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(createRuntimeInstanceSchema),
  createRuntimeInstance
);
router.patch(
  "/:id/devops-info/instances/:instanceId",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(patchRuntimeInstanceSchema),
  patchRuntimeInstance
);
router.delete(
  "/:id/devops-info/instances/:instanceId",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(runtimeInstanceParamsSchema),
  deleteRuntimeInstance
);
router.get(
  "/:id/devops-info/targets",
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.REPRESENTATIVE_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.QUALITY_PROJECTS_READ
  ),
  listTestTargets
);
router.post(
  "/:id/devops-info/targets",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(createTestTargetSchema),
  createTestTarget
);
router.patch(
  "/:id/devops-info/targets/:targetId",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(patchTestTargetSchema),
  patchTestTarget
);
router.delete(
  "/:id/devops-info/targets/:targetId",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(testTargetParamsSchema),
  deleteTestTarget
);
router.get(
  "/:id/devops-info/credential-groups",
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.QUALITY_PROJECTS_READ
  ),
  listCredentialGroups
);
router.post(
  "/:id/devops-info/credential-groups",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(createCredentialGroupSchema),
  createCredentialGroup
);
router.patch(
  "/:id/devops-info/credential-groups/:groupId",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(patchCredentialGroupSchema),
  patchCredentialGroup
);
router.delete(
  "/:id/devops-info/credential-groups/:groupId",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(credentialGroupParamsSchema),
  deleteCredentialGroup
);
router.get(
  "/:id/devops-info/artifacts",
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.PENTEST_PROJECTS_READ,
    PERMISSIONS.QA_PROJECTS_READ,
    PERMISSIONS.DEVOPS_PROJECTS_READ,
    PERMISSIONS.SECURITY_PROJECTS_READ,
    PERMISSIONS.QUALITY_PROJECTS_READ
  ),
  listMobileArtifacts
);
router.post(
  "/:id/devops-info/artifacts",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(createMobileArtifactSchema),
  createMobileArtifact
);
router.patch(
  "/:id/devops-info/artifacts/:artifactId",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(patchMobileArtifactSchema),
  patchMobileArtifact
);
router.delete(
  "/:id/devops-info/artifacts/:artifactId",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.DEVOPS_PROJECTS_READ),
  validate(mobileArtifactParamsSchema),
  deleteMobileArtifact
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
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.SECURITY_PROJECTS_ASSIGN),
  validate(projectSecurityScopeSchema),
  putProjectSecurityScope
);
router.get(
  "/:id/pentester-scopes",
  requireProjectAccess("params.id"),
  requirePermission(PERMISSIONS.SECURITY_PROJECTS_ASSIGN),
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
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.SECURITY_PROJECTS_ASSIGN,
    PERMISSIONS.QUALITY_PROJECTS_ASSIGN
  ),
  getEligibleProjectAssignees
);
router.post(
  ROUTES.PROJECTS.ASSIGN_USERS,
  requireProjectAccess("params.id"),
  requireAnyPermission(
    PERMISSIONS.SECURITY_PROJECTS_ASSIGN,
    PERMISSIONS.QUALITY_PROJECTS_ASSIGN
  ),
  validate(assignUsersSchema),
  assignUsersToProject
);

export default router;
