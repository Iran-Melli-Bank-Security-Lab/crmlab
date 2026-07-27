export type NotificationTypeContract =
  | "project.created"
  | "project.assigned"
  | "project.completed"
  | "project.report_submitted"
  | "project.devops_assigned"
  | "project.devops_ready"
  | "project.devops_blocked"
  | "project.devops_retry_requested"
  | "project.manager_activated"
  | "task.assigned"
  | "vulnerability.created"
  | "vulnerability.updated"
  | "vulnerability.approved"
  | "vulnerability.rejected"
  | "deployment.started"
  | "deployment.failed"
  | "devops.access_created"
  | "devops.access_updated"
  | "ticket.created"
  | "ticket.updated"
  | "qa.testcase.created"
  | "qa.result.submitted"
  | "qa.result.approved"
  | "qa.result.rejected"
  | "user.role_updated"
  | "system.announcement";

export type NotificationPriorityContract = "low" | "medium" | "high" | "critical";
export type NotificationReadFilterContract = "all" | "read" | "unread";

export type NotificationEntityContract = {
  id: string;
  type:
    | "project"
    | "task"
    | "vulnerability"
    | "deployment"
    | "ticket"
    | "qa_testcase"
    | "qa_result"
    | "user"
    | "system";
  label?: string;
};

export type NotificationContract = {
  id: string;
  type: NotificationTypeContract;
  title: string;
  message: string;
  priority: NotificationPriorityContract;
  isRead: boolean;
  userId?: string;
  projectId?: string;
  entityId?: string;
  entity?: NotificationEntityContract;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
};

export type NotificationPageContract = {
  items: NotificationContract[];
  pageInfo: { nextCursor?: string; hasMore: boolean };
  unreadCount: number;
};
