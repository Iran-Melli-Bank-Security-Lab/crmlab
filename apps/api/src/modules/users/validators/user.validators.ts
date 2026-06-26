import { z } from "zod";
import { ALL_PERMISSIONS } from "@/constants/permissions";
import { ALL_ROLES } from "@/constants/roles";

const roleValues = ALL_ROLES as [string, ...string[]];
const permissionValues = ALL_PERMISSIONS as [string, ...string[]];

const permissionListSchema = z.array(z.enum(permissionValues)).default([]);
const userStatusSchema = z.enum(["Active", "Inactive"]);

export const updateUserRolesPermissionsSchema = z.object({
  params: z
    .object({
      id: z.string().min(1, "User id is required").optional(),
      userId: z.string().min(1, "User id is required").optional(),
    })
    .refine((params) => params.id || params.userId, "User id is required"),
  body: z.object({
    roles: z.array(z.enum(roleValues)).min(1, "A user must have at least one role"),
    permissions: permissionListSchema.optional(),
    status: userStatusSchema.optional(),
  }),
  query: z.object({}).optional(),
});

export const updateRolePermissionsSchema = z.object({
  params: z.object({
    key: z.enum(roleValues),
  }),
  body: z.object({
    permissions: permissionListSchema,
  }),
  query: z.object({}).optional(),
});
