import { api } from "@/shared/api/baseApi";
import { unwrapApiData } from "@/shared/api/unwrapApiData";
import type { AppNotification } from "@/entities/notification/model/notification";

type NotificationListPayload = AppNotification[] | { items?: AppNotification[] };
type NotificationListResponse = NotificationListPayload | { success?: boolean; data?: NotificationListPayload };

type SuccessResponse = { success?: boolean; data?: { id?: string; isRead?: boolean; deleted?: boolean } };

const normalizeNotifications = (response: NotificationListResponse) => {
  const payload = unwrapApiData<NotificationListPayload>(response);
  return Array.isArray(payload) ? payload : payload.items || [];
};

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<AppNotification[], void>({
      query: () => "/notifications",
      transformResponse: normalizeNotifications,
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<{ id?: string; isRead?: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      transformResponse: (response: SuccessResponse) => unwrapApiData(response),
      invalidatesTags: ["Notifications"],
    }),
    markAllNotificationsRead: builder.mutation<{ isRead?: boolean }, void>({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
      transformResponse: (response: SuccessResponse) => unwrapApiData(response),
      invalidatesTags: ["Notifications"],
    }),
    deleteNotification: builder.mutation<{ id?: string; deleted?: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: "DELETE" }),
      transformResponse: (response: SuccessResponse) => unwrapApiData(response),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} = notificationsApi;
