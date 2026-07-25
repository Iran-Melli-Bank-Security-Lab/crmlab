import { z } from "zod";

const optionalFilter = z.string().trim().max(200).optional();
const date = z.string().trim().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "Invalid date"
);

export const auditLogListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(10).max(100).default(25),
    search: optionalFilter,
    user: optionalFilter,
    action: optionalFilter,
    module: optionalFilter,
    project: optionalFilter,
    ip: z.string().trim().max(64).optional(),
    status: z.enum(["success", "failure"]).optional(),
    from: date.optional(),
    to: date.optional(),
    sortBy: z.enum(["createdAt", "action", "module", "entityType", "ip", "status"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }).strict(),
});

export const auditLogDetailSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid audit log id"),
  }),
});
