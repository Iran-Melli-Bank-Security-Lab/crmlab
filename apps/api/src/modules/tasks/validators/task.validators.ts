import { z } from "zod";
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "@/constants/tasks";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const deadline = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid deadline");

export const createTaskRequestSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(5000).default(""),
    assigneeId: objectId,
    priority: z.enum(TASK_PRIORITY_VALUES).default("medium"),
    status: z.enum(TASK_STATUS_VALUES).default("todo"),
    deadline,
  })
  .strict();

export const updateTaskRequestSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    assigneeId: objectId.optional(),
    priority: z.enum(TASK_PRIORITY_VALUES).optional(),
    status: z.enum(TASK_STATUS_VALUES).optional(),
    deadline: deadline.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, "At least one field is required");

export const createTaskSchema = z.object({ body: createTaskRequestSchema });
export const updateTaskSchema = z.object({ body: updateTaskRequestSchema });
export const taskIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;
