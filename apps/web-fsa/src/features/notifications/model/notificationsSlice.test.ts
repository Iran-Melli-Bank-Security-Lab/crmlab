import assert from "node:assert/strict";
import test from "node:test";
import type { AppNotification } from "@/entities/notification/model/notification";
import reducer, {
  notificationMarkedRead,
  notificationReceived,
  notificationsHydrated,
  notificationsSynced,
} from "./notificationsSlice";

const notification = (id: string, createdAt: string, isRead = false): AppNotification => ({
  id,
  type: "system.announcement",
  title: id,
  message: id,
  priority: "medium",
  isRead,
  createdAt,
});

test("realtime delivery is idempotent and optimistic read counts decrement once", () => {
  let state = reducer(undefined, { type: "init" });
  state = reducer(state, notificationReceived(notification("one", "2026-01-02T00:00:00Z")));
  state = reducer(state, notificationReceived(notification("one", "2026-01-02T00:00:00Z")));
  assert.equal(state.items.length, 1);
  assert.equal(state.unreadCount, 1);

  state = reducer(state, notificationMarkedRead("one"));
  state = reducer(state, notificationMarkedRead("one"));
  assert.equal(state.unreadCount, 0);
});

test("HTTP reconnect snapshot removes stale recent records but preserves paginated history", () => {
  let state = reducer(undefined, { type: "init" });
  state = reducer(state, notificationsSynced([
    notification("deleted-recent", "2026-01-03T00:00:00Z"),
    notification("older-page", "2025-12-01T00:00:00Z", true),
  ]));
  state = reducer(state, notificationsHydrated({
    items: [notification("current", "2026-01-02T00:00:00Z")],
    pageInfo: { hasMore: true, nextCursor: "cursor" },
    unreadCount: 1,
  }));

  assert.deepEqual(state.items.map((item) => item.id), ["current", "older-page"]);
  assert.equal(state.unreadCount, 1);
});
