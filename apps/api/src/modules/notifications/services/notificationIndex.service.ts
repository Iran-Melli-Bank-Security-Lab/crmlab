import {
  NOTIFICATION_DEDUPE_INDEX,
  NotificationModel,
} from "../models/notification.model";

function isIndexNotFound(error: unknown) {
  return Boolean(
    error && typeof error === "object" && "code" in error &&
    (error as { code?: number }).code === 27
  );
}

export async function ensureNotificationIndexes() {
  const collection = NotificationModel.collection;
  const indexes = await collection.indexes();
  const dedupeIndex = indexes.find(
    (index) => index.name === NOTIFICATION_DEDUPE_INDEX.name
  );
  const partial = dedupeIndex?.partialFilterExpression;
  const compatible = Boolean(
    dedupeIndex?.unique &&
    partial &&
    Object.hasOwn(partial, "userId") &&
    Object.hasOwn(partial, "dedupeKey")
  );
  if (dedupeIndex && !compatible) {
    try {
      await collection.dropIndex(NOTIFICATION_DEDUPE_INDEX.name);
    } catch (error) {
      if (!isIndexNotFound(error)) throw error;
    }
  }

  // autoIndex is disabled globally. Notification deduplication and list-query
  // indexes are correctness/performance requirements, so initialize the schema's
  // declared indexes explicitly during startup.
  await NotificationModel.createIndexes();
}
