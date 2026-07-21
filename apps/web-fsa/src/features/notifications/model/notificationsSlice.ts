import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/store";
import type { AppNotification, NotificationConnectionStatus, NotificationPage, NotificationReadFilter } from "@/entities/notification/model/notification";

type NotificationsState = {
  items: AppNotification[];
  unreadCount: number;
  connectionStatus: NotificationConnectionStatus;
  page: { filter: NotificationReadFilter; ids: string[]; nextCursor?: string; hasMore: boolean };
  lastEventAt?: string;
  error?: string;
};

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  connectionStatus: "idle",
  page: { filter: "all", ids: [], hasMore: true },
};

const sortByNewest = (items: AppNotification[]) => [...items].sort((a, b) => {
  const dateDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  return dateDifference || b.id.localeCompare(a.id);
});

function upsert(items: AppNotification[], incoming: AppNotification[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, { ...byId.get(item.id), ...item }));
  return sortByNewest(Array.from(byId.values()));
}

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    notificationsHydrated: (state, action: PayloadAction<NotificationPage>) => {
      const snapshotIds = new Set(action.payload.items.map((item) => item.id));
      const oldestSnapshotTime = action.payload.items.length
        ? Math.min(...action.payload.items.map((item) => new Date(item.createdAt).getTime()))
        : Number.POSITIVE_INFINITY;
      const preservedOlderItems = action.payload.pageInfo.hasMore
        ? state.items.filter((item) => !snapshotIds.has(item.id) && new Date(item.createdAt).getTime() < oldestSnapshotTime)
        : [];
      // Reconcile the recent server window so deletions made in another tab
      // while this tab was offline do not survive a reconnect.
      state.items = upsert(preservedOlderItems, action.payload.items);
      state.unreadCount = action.payload.unreadCount;
      state.lastEventAt = new Date().toISOString();
    },
    notificationsSynced: (state, action: PayloadAction<AppNotification[]>) => {
      state.items = upsert(state.items, action.payload);
      state.lastEventAt = new Date().toISOString();
    },
    notificationPageReset: (state, action: PayloadAction<NotificationReadFilter>) => {
      state.page = { filter: action.payload, ids: [], hasMore: true };
    },
    notificationPageLoaded: (state, action: PayloadAction<{ page: NotificationPage; filter: NotificationReadFilter; reset: boolean }>) => {
      const { page, filter, reset } = action.payload;
      state.items = upsert(state.items, page.items);
      const incomingIds = page.items.map((item) => item.id);
      state.page = {
        filter,
        ids: reset ? incomingIds : Array.from(new Set([...state.page.ids, ...incomingIds])),
        nextCursor: page.pageInfo.nextCursor,
        hasMore: page.pageInfo.hasMore,
      };
      state.unreadCount = page.unreadCount;
    },
    notificationReceived: (state, action: PayloadAction<AppNotification>) => {
      const previous = state.items.find((item) => item.id === action.payload.id);
      state.items = upsert(state.items, [action.payload]);
      if (!previous && !action.payload.isRead) state.unreadCount += 1;
      if (!state.page.ids.includes(action.payload.id) && (state.page.filter === "all" || (state.page.filter === "unread" && !action.payload.isRead) || (state.page.filter === "read" && action.payload.isRead))) {
        state.page.ids.unshift(action.payload.id);
      }
      state.lastEventAt = new Date().toISOString();
    },
    notificationUpdated: (state, action: PayloadAction<AppNotification>) => {
      const previous = state.items.find((item) => item.id === action.payload.id);
      state.items = upsert(state.items, [action.payload]);
      if (previous?.isRead && !action.payload.isRead) state.unreadCount += 1;
      if (previous && !previous.isRead && action.payload.isRead) state.unreadCount = Math.max(0, state.unreadCount - 1);
      state.lastEventAt = new Date().toISOString();
    },
    notificationDeleted: (state, action: PayloadAction<string>) => {
      const deleted = state.items.find((item) => item.id === action.payload);
      state.items = state.items.filter((item) => item.id !== action.payload);
      if (deleted && !deleted.isRead) state.unreadCount = Math.max(0, state.unreadCount - 1);
      state.page.ids = state.page.ids.filter((id) => id !== action.payload);
      state.lastEventAt = new Date().toISOString();
    },
    notificationMarkedRead: (state, action: PayloadAction<string>) => {
      const notification = state.items.find((item) => item.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    allNotificationsMarkedRead: (state) => {
      state.items.forEach((item) => { item.isRead = true; });
      state.unreadCount = 0;
    },
    unreadCountReceived: (state, action: PayloadAction<number>) => {
      state.unreadCount = Math.max(0, action.payload);
    },
    notificationConnectionChanged: (state, action: PayloadAction<{ status: NotificationConnectionStatus; error?: string }>) => {
      state.connectionStatus = action.payload.status;
      state.error = action.payload.error;
    },
    notificationsCleared: () => initialState,
  },
});

export const {
  allNotificationsMarkedRead,
  notificationConnectionChanged,
  notificationDeleted,
  notificationMarkedRead,
  notificationPageLoaded,
  notificationPageReset,
  notificationReceived,
  notificationsCleared,
  notificationsHydrated,
  notificationsSynced,
  notificationUpdated,
  unreadCountReceived,
} = notificationsSlice.actions;

export const selectNotifications = (state: RootState) => state.notifications.items;
export const selectUnreadNotificationCount = (state: RootState) => state.notifications.unreadCount;
export const selectNotificationConnectionStatus = (state: RootState) => state.notifications.connectionStatus;
export const selectNotificationPage = (state: RootState) => {
  const byId = new Map(state.notifications.items.map((item) => [item.id, item]));
  const filter = state.notifications.page.filter;
  return {
    ...state.notifications.page,
    items: state.notifications.page.ids.map((id) => byId.get(id)).filter((item): item is AppNotification => Boolean(item)).filter((item) => filter === "all" || (filter === "read" ? item.isRead : !item.isRead)),
  };
};

export default notificationsSlice.reducer;
