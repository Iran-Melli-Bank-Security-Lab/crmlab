export const TASK_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const TASK_PRIORITY_VALUES = Object.values(TASK_PRIORITIES);

export const TASK_STATUSES = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const TASK_STATUS_VALUES = Object.values(TASK_STATUSES);

export type TaskPriority = (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];
export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];
