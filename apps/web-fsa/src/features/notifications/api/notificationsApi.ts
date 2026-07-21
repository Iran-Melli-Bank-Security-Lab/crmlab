import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";
import {
  normalizeNotification,
  type AppNotification,
  type NotificationPage,
  type NotificationReadFilter,
} from "@/entities/notification/model/notification";

export type NotificationListArgs = {
  cursor?: string;
  limit?: number;
  read?: NotificationReadFilter;
  // Partitions RTK Query caches when another account signs in in the same tab.
  // It is intentionally not sent to the server; identity comes from the cookie.
  scope?: string;
};

type LegacyListPayload = AppNotification[] | { items?: AppNotification[]; pageInfo?: NotificationPage["pageInfo"]; unreadCount?: number };
type SuccessResponse = { success?: boolean; data?: { id?: string; isRead?: boolean; deleted?: boolean; modifiedCount?: number } };

const normalizeNotifications = (response: LegacyListPayload | { data?: LegacyListPayload }): NotificationPage => {
  const payload = unwrapApiData<LegacyListPayload>(response);
  if (Array.isArray(payload)) {
    const items = payload.map(normalizeNotification);
    return { items, pageInfo: { hasMore: false }, unreadCount: items.filter((item) => !item.isRead).length };
  }
  const items = (payload.items || []).map(normalizeNotification);
  return {
    items,
    pageInfo: payload.pageInfo || { hasMore: false },
    unreadCount: typeof payload.unreadCount === "number" ? payload.unreadCount : items.filter((item) => !item.isRead).length,
  };
};

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationPage, NotificationListArgs | void>({
      query: (args) => {
        const params = { ...(args || { limit: 25 }) };
        delete params.scope;
        return { url: "/notifications", params };
      },
      transformResponse: normalizeNotifications,
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<{ id?: string; isRead?: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      transformResponse: (response: SuccessResponse) => unwrapApiData(response),
    }),
    markAllNotificationsRead: builder.mutation<{ isRead?: boolean; modifiedCount?: number }, void>({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
      transformResponse: (response: SuccessResponse) => unwrapApiData(response),
    }),
    deleteNotification: builder.mutation<{ id?: string; deleted?: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: "DELETE" }),
      transformResponse: (response: SuccessResponse) => unwrapApiData(response),
    }),
  }),
});

export const {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} = notificationsApi;
