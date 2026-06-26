import type { AppNotification } from "@/entities/notification/model/notification";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

const OS_NOTIFICATION_TAG_PREFIX = "reac-lab-notification";

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

function shouldSendBrowserNotification(notification: AppNotification) {
  if (notification.type === "project.assigned") return true;
  return notification.priority === "high" || notification.priority === "critical";
}

export function showBrowserNotification(notification: AppNotification) {
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  if (!shouldSendBrowserNotification(notification)) return false;

  const osNotification = new Notification(notification.title, {
    body: notification.message,
    tag: `${OS_NOTIFICATION_TAG_PREFIX}:${notification.id}`,
    data: {
      id: notification.id,
      actionUrl: notification.actionUrl,
      projectId: notification.projectId,
      type: notification.type,
    },
  });

  osNotification.onclick = () => {
    window.focus();
    if (notification.actionUrl) {
      window.location.assign(notification.actionUrl);
    }
    osNotification.close();
  };

  return true;
}
