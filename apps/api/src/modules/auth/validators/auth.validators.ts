import { z } from "zod";
import { ALL_ROLES } from "@/constants/roles";

const roleValues = ALL_ROLES as [string, ...string[]];

const avatarUrlSchema = z.union([
  z.url(),
  z.string().regex(/^\/uploads\/[^/]+$/),
  z.literal(""),
]);

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(2),
    password: z.string().min(6),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    username: z.string().min(2),
    password: z.string().min(6),
    avatarUrl: avatarUrlSchema.optional(),
    roles: z.array(z.enum(roleValues)).min(1).optional(),
  }),
});

export const registerAdminSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    username: z.string().min(2),
    password: z.string().min(6),
    avatarUrl: avatarUrlSchema.optional(),
  }),
});
