export const NOTIFICATION_TYPES = {
  PROJECT_ASSIGNED: "project.assigned",
  VULNERABILITY_CREATED: "vulnerability.created",
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const NOTIFICATION_PRIORITY_VALUES = Object.values(NOTIFICATION_PRIORITIES);

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[keyof typeof NOTIFICATION_PRIORITIES];
