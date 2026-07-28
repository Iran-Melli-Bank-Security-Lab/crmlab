import type {
  NotificationPriorityContract,
  NotificationTypeContract,
} from "@role-dashboard/contracts";

export const NOTIFICATION_TYPES = {
  PROJECT_CREATED: "project.created",
  PROJECT_ASSIGNED: "project.assigned",
  PROJECT_COMPLETED: "project.completed",
  PROJECT_REPORT_SUBMITTED: "project.report_submitted",
  PROJECT_DEVOPS_ASSIGNED: "project.devops_assigned",
  PROJECT_DEVOPS_READY: "project.devops_ready",
  PROJECT_DEVOPS_BLOCKED: "project.devops_blocked",
  PROJECT_DEVOPS_RETRY_REQUESTED: "project.devops_retry_requested",
  PROJECT_DEVOPS_RESOLUTION_SUBMITTED: "project.devops_resolution_submitted",
  PROJECT_MANAGER_ACTIVATED: "project.manager_activated",
  TASK_ASSIGNED: "task.assigned",
  VULNERABILITY_CREATED: "vulnerability.created",
  VULNERABILITY_UPDATED: "vulnerability.updated",
  VULNERABILITY_APPROVED: "vulnerability.approved",
  VULNERABILITY_REJECTED: "vulnerability.rejected",
  DEPLOYMENT_STARTED: "deployment.started",
  DEPLOYMENT_FAILED: "deployment.failed",
  DEVOPS_ACCESS_CREATED: "devops.access_created",
  DEVOPS_ACCESS_UPDATED: "devops.access_updated",
  TICKET_CREATED: "ticket.created",
  TICKET_UPDATED: "ticket.updated",
  QA_TESTCASE_CREATED: "qa.testcase.created",
  QA_RESULT_SUBMITTED: "qa.result.submitted",
  QA_RESULT_APPROVED: "qa.result.approved",
  QA_RESULT_REJECTED: "qa.result.rejected",
  USER_ROLE_UPDATED: "user.role_updated",
  SYSTEM_ANNOUNCEMENT: "system.announcement",
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const NOTIFICATION_PRIORITY_VALUES = Object.values(NOTIFICATION_PRIORITIES);

export type NotificationType = NotificationTypeContract;
export type NotificationPriority = NotificationPriorityContract;
