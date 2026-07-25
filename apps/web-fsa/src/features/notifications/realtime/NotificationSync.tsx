import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import type { AppDispatch } from "@/app/store/store";
import { api } from "@/shared/api/baseApi";
import { useAuth } from "@/features/auth/model/useAuth";
import { useGetNotificationsQuery } from "@/features/notifications/api/notificationsApi";
import { notificationSocket } from "@/features/notifications/realtime/notificationSocket";
import { normalizeNotification, type AppNotification } from "@/entities/notification/model/notification";
import { showBrowserNotification } from "@/features/notifications/browser/browserNotification";
import {
  allNotificationsMarkedRead,
  notificationConnectionChanged,
  notificationDeleted,
  notificationMarkedRead,
  notificationReceived,
  notificationsCleared,
  notificationsHydrated,
  notificationsSynced,
  notificationUpdated,
  unreadCountReceived,
} from "@/features/notifications/model/notificationsSlice";

const shouldToast = (notification: AppNotification) => notification.priority === "high" || notification.priority === "critical";
const shouldRefreshProjects = (notification: AppNotification) => notification.type === "project.assigned" || notification.type === "project.created";
const shouldRefreshPentest = (notification: AppNotification) =>
  notification.type === "vulnerability.updated" ||
  notification.type === "vulnerability.created";

export default function NotificationSync() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, roles, user } = useAuth();
  const knownIds = useRef(new Set<string>());
  const { data, refetch } = useGetNotificationsQuery({ limit: 25, scope: user?.id }, {
    skip: !isAuthenticated,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!data) return;
    data.items.forEach((item) => knownIds.current.add(item.id));
    dispatch(notificationsHydrated(data));
  }, [data, dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      notificationSocket.disconnect();
      knownIds.current.clear();
      dispatch(notificationsCleared());
      return;
    }

    dispatch(notificationConnectionChanged({ status: "connecting" }));
    notificationSocket.connect(
      { userId: user.id, roles },
      {
        onConnect: () => {
          dispatch(notificationConnectionChanged({ status: "connected" }));
          void refetch();
        },
        onDisconnect: () => dispatch(notificationConnectionChanged({ status: "disconnected" })),
        onError: (message) => dispatch(notificationConnectionChanged({ status: "error", error: message })),
        onNotification: (rawNotification) => {
          const notification = normalizeNotification(rawNotification);
          const isNew = !knownIds.current.has(notification.id);
          knownIds.current.add(notification.id);
          dispatch(notificationReceived(notification));
          if (shouldRefreshProjects(notification)) dispatch(api.util.invalidateTags(["Projects"]));
          if (shouldRefreshPentest(notification)) {
            dispatch(api.util.invalidateTags(["Pentest"]));
          }
          // Recovered Socket.IO packets and reconnect snapshots must not create
          // duplicate toasts or OS notifications.
          if (isNew) {
            showBrowserNotification(notification);
            if (shouldToast(notification)) toast(notification.title);
          }
        },
        onNotificationUpdated: (item) => dispatch(notificationUpdated(normalizeNotification(item))),
        onNotificationRead: (id) => dispatch(notificationMarkedRead(id)),
        onNotificationsReadAll: () => dispatch(allNotificationsMarkedRead()),
        onNotificationDeleted: (id) => dispatch(notificationDeleted(id)),
        onNotificationsSync: (items) => {
          const normalized = items.map(normalizeNotification);
          normalized.forEach((item) => knownIds.current.add(item.id));
          dispatch(notificationsSynced(normalized));
        },
        onUnreadCount: (count) => dispatch(unreadCountReceived(count)),
        onProjectEvent: () => dispatch(api.util.invalidateTags(["Projects"])),
      }
    );

    return () => notificationSocket.disconnect();
  }, [dispatch, isAuthenticated, refetch, roles, user?.id]);

  return null;
}
