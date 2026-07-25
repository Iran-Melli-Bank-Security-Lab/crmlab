import type { RequestHandler } from "express";
import { HTTP_STATUS } from "@/constants/http";
import { PERMISSIONS, type Permission } from "@/constants/permissions";
import type { Role } from "@/constants/roles";
import { AppError } from "@/utils/AppError";

function hasAdminAccess(userPermissions: Permission[]) {
  return userPermissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE);
}

export function requirePermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    const userPermissions = req.user?.permissions || [];
    if (hasAdminAccess(userPermissions)) return next();

    const allowed = permissions.every((permission) => userPermissions.includes(permission));

    if (!allowed) {
      return next(new AppError("Forbidden: missing permission", HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
}

export function requireAnyPermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    const userPermissions = req.user?.permissions || [];
    if (hasAdminAccess(userPermissions)) return next();

    const allowed = permissions.some((permission) => userPermissions.includes(permission));

    if (!allowed) {
      return next(new AppError("Forbidden: missing permission", HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
}

export function hasRequiredRole(userRoles: readonly Role[], roles: readonly Role[]) {
  return roles.some((role) => userRoles.includes(role));
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !hasRequiredRole(req.user.roles, roles)) {
      return next(new AppError("Forbidden: required role is missing", HTTP_STATUS.FORBIDDEN));
    }
    next();
  };
}
