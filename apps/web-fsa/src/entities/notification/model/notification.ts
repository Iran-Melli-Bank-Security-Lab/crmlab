export type NotificationType =
  | "project.created"
  | "project.assigned"
  | "project.completed"
  | "project.report_submitted"
  | "vulnerability.created"
  | "vulnerability.updated"
  | "vulnerability.approved"
  | "vulnerability.rejected"
  | "deployment.started"
  | "deployment.failed"
  | "ticket.created"
  | "ticket.updated"
  | "qa.testcase.created"
  | "qa.result.submitted"
  | "qa.result.approved"
  | "qa.result.rejected"
  | "user.role_updated"
  | "system.announcement";

export type NotificationPriority = "low" | "medium" | "high" | "critical";
export type NotificationChannel = "in_app" | "email" | "sms" | "push";
export type NotificationDeliveryStatus = "queued" | "delivered" | "read" | "failed";

export type NotificationActor = {
  id: string;
  name: string;
  role?: string;
};

export type NotificationEntity = {
  id: string;
  type:
    | "project"
    | "vulnerability"
    | "deployment"
    | "ticket"
    | "qa_testcase"
    | "qa_result"
    | "user"
    | "system";
  label?: string;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;

  userId?: string;
  roleIds?: string[];
  channels?: NotificationChannel[];
  deliveryStatus?: NotificationDeliveryStatus;

  actor?: NotificationActor;
  entity?: NotificationEntity;
  projectId?: string;
  entityId?: string;

  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

export type NotificationConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type NotificationSocketEvent =
  | { event: "notification:new"; payload: AppNotification }
  | { event: "notification:updated"; payload: AppNotification }
  | { event: "notification:deleted"; payload: { id: string } }
  | { event: "notifications:sync"; payload: AppNotification[] }
  | { event: "notifications:unread_count"; payload: { count: number } };
