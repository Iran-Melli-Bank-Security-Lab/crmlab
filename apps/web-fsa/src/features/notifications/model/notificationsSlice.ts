import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/app/store/store";
import type {
  AppNotification,
  NotificationConnectionStatus,
} from "@/entities/notification/model/notification";

type NotificationsState = {
  items: AppNotification[];
  unreadCount: number;
  connectionStatus: NotificationConnectionStatus;
  lastEventAt?: string;
  error?: string;
};

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  connectionStatus: "idle",
};

const sortByNewest = (items: AppNotification[]) => {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

const calculateUnreadCount = (items: AppNotification[]) =>
  items.filter((item) => !item.isRead).length;

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    notificationsLoaded: (state, action: PayloadAction<AppNotification[]>) => {
      state.items = sortByNewest(action.payload);
      state.unreadCount = calculateUnreadCount(state.items);
      state.lastEventAt = new Date().toISOString();
    },
    notificationReceived: (state, action: PayloadAction<AppNotification>) => {
      const existingIndex = state.items.findIndex(
        (item) => item.id === action.payload.id
      );
      if (existingIndex >= 0) {
        state.items[existingIndex] = action.payload;
      } else {
        state.items.unshift(action.payload);
      }
      state.items = sortByNewest(state.items).slice(0, 100);
      state.unreadCount = calculateUnreadCount(state.items);
      state.lastEventAt = new Date().toISOString();
    },
    notificationUpdated: (state, action: PayloadAction<AppNotification>) => {
      const existingIndex = state.items.findIndex(
        (item) => item.id === action.payload.id
      );
      if (existingIndex >= 0) {
        state.items[existingIndex] = action.payload;
      } else {
        state.items.unshift(action.payload);
      }
      state.items = sortByNewest(state.items);
      state.unreadCount = calculateUnreadCount(state.items);
      state.lastEventAt = new Date().toISOString();
    },
    notificationDeleted: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.unreadCount = calculateUnreadCount(state.items);
      state.lastEventAt = new Date().toISOString();
    },
    notificationMarkedRead: (state, action: PayloadAction<string>) => {
      const notification = state.items.find((item) => item.id === action.payload);
      if (notification) notification.isRead = true;
      state.unreadCount = calculateUnreadCount(state.items);
    },
    allNotificationsMarkedRead: (state) => {
      state.items = state.items.map((item) => ({ ...item, isRead: true }));
      state.unreadCount = 0;
    },
    unreadCountReceived: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    notificationConnectionChanged: (
      state,
      action: PayloadAction<{ status: NotificationConnectionStatus; error?: string }>
    ) => {
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
  notificationReceived,
  notificationsCleared,
  notificationsLoaded,
  notificationUpdated,
  unreadCountReceived,
} = notificationsSlice.actions;

export const selectNotifications = (state: RootState) => state.notifications.items;
export const selectUnreadNotificationCount = (state: RootState) =>
  state.notifications.unreadCount;
export const selectNotificationConnectionStatus = (state: RootState) =>
  state.notifications.connectionStatus;

export default notificationsSlice.reducer;
