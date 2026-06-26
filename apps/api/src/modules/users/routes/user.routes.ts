import { Router } from "express";
import { ROUTES } from "@/constants/routes";
import { requireAuth } from "@/middlewares/auth.middleware";
import { requirePermission } from "@/middlewares/permission.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { PERMISSIONS } from "@/constants/permissions";
import {
  createUser,
  deleteUser,
  getRolesPermissions,
  getUserById,
  getUsers,
  syncRolePermissionsForDashboard,
  updateRolePermissionsForDashboard,
  updateUserRolesPermissions,
} from "../controllers/user.controller";
import { updateRolePermissionsSchema, updateUserRolesPermissionsSchema } from "../validators/user.validators";

const router = Router();

router.use(requireAuth);
router.get(ROUTES.ROOT, requirePermission(PERMISSIONS.ADMIN_USERS_READ), getUsers);
router.post(ROUTES.ROOT, requirePermission(PERMISSIONS.ADMIN_USERS_CREATE), createUser);
router.get(ROUTES.USERS.ROLES, requirePermission(PERMISSIONS.ADMIN_ROLES_READ), getRolesPermissions);
router.post(
  ROUTES.USERS.ROLES_SYNC_PERMISSIONS,
  requirePermission(PERMISSIONS.ADMIN_ROLES_UPDATE),
  syncRolePermissionsForDashboard
);
router.patch(
  ROUTES.USERS.ROLE_PERMISSIONS,
  requirePermission(PERMISSIONS.ADMIN_ROLES_UPDATE),
  validate(updateRolePermissionsSchema),
  updateRolePermissionsForDashboard
);
router.patch(
  ROUTES.USERS.ROLES_PERMISSIONS,
  requirePermission(PERMISSIONS.ADMIN_USERS_UPDATE),
  validate(updateUserRolesPermissionsSchema),
  updateUserRolesPermissions
);
router.get(ROUTES.USERS.DETAIL, requirePermission(PERMISSIONS.ADMIN_USERS_READ), getUserById);
router.put(
  ROUTES.USERS.DETAIL,
  requirePermission(PERMISSIONS.ADMIN_USERS_UPDATE),
  validate(updateUserRolesPermissionsSchema),
  updateUserRolesPermissions
);
router.delete(ROUTES.USERS.DETAIL, requirePermission(PERMISSIONS.ADMIN_USERS_DELETE), deleteUser);

export default router;
