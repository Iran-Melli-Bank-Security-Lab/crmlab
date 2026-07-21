import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/app/store/store";
import type { NotificationReadFilter } from "@/entities/notification/model/notification";
import {
  allNotificationsMarkedRead,
  notificationDeleted,
  notificationMarkedRead,
  notificationPageLoaded,
  notificationPageReset,
  selectNotificationConnectionStatus,
  selectNotificationPage,
  selectNotifications,
  selectUnreadNotificationCount,
} from "@/features/notifications/model/notificationsSlice";
import { useAuth } from "@/features/auth/model/useAuth";
import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/features/notifications/api/notificationsApi";

export function useNotifications() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useAuth();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadNotificationCount);
  const connectionStatus = useSelector(selectNotificationConnectionStatus);
  const page = useSelector(selectNotificationPage);
  const { error, isLoading, isFetching, refetch } = useGetNotificationsQuery({ limit: 25, scope: user?.id }, { skip: !isAuthenticated });
  const [getPage, pageState] = useLazyGetNotificationsQuery();
  const [markNotificationRead, markReadState] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead, markAllReadState] = useMarkAllNotificationsReadMutation();
  const [deleteNotificationRequest, deleteState] = useDeleteNotificationMutation();
  const latestPageRequest = useRef(0);

  const markRead = useCallback(async (id: string) => {
    dispatch(notificationMarkedRead(id));
    try {
      return await markNotificationRead(id).unwrap();
    } catch (requestError) {
      refetch();
      throw requestError;
    }
  }, [dispatch, markNotificationRead, refetch]);

  const markAllRead = useCallback(async () => {
    dispatch(allNotificationsMarkedRead());
    try {
      return await markAllNotificationsRead().unwrap();
    } catch (requestError) {
      refetch();
      throw requestError;
    }
  }, [dispatch, markAllNotificationsRead, refetch]);

  const removeNotification = useCallback(async (id: string) => {
    dispatch(notificationDeleted(id));
    try {
      return await deleteNotificationRequest(id).unwrap();
    } catch (requestError) {
      refetch();
      throw requestError;
    }
  }, [deleteNotificationRequest, dispatch, refetch]);

  const loadNotificationsPage = useCallback(async (filter: NotificationReadFilter, reset = false) => {
    const requestId = ++latestPageRequest.current;
    const cursor = reset || page.filter !== filter ? undefined : page.nextCursor;
    if (reset || page.filter !== filter) dispatch(notificationPageReset(filter));
    const result = await getPage({ limit: 25, read: filter, cursor, scope: user?.id }, true).unwrap();
    if (requestId !== latestPageRequest.current) return result;
    dispatch(notificationPageLoaded({ page: result, filter, reset: reset || page.filter !== filter }));
    return result;
  }, [dispatch, getPage, page.filter, page.nextCursor, user?.id]);

  return {
    notifications,
    unreadCount,
    connectionStatus,
    page,
    hasUnread: unreadCount > 0,
    error,
    isLoading,
    isFetching,
    isLoadingPage: pageState.isFetching,
    pageError: pageState.error,
    isMarkingRead: markReadState.isLoading,
    isMarkingAllRead: markAllReadState.isLoading,
    isDeleting: deleteState.isLoading,
    markRead,
    markAllRead,
    removeNotification,
    loadNotificationsPage,
    refetch,
  };
}
