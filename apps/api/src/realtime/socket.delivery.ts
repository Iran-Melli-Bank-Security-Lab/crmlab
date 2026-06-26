import { SOCKET_ROOMS } from "@/constants/socket";
import { getIOIfInitialized } from "./socket.server";
import { joinUserSocketsToProject } from "./socket.rooms";
import type { ServerToClientEvents } from "./socket.types";

type EventName = keyof ServerToClientEvents;
type EventPayload<TEvent extends EventName> = Parameters<ServerToClientEvents[TEvent]>[0];
type TypedBroadcastOperator<TEvent extends EventName> = {
  emit(eventName: TEvent, eventPayload: EventPayload<TEvent>): boolean;
};

export function emitToUser<TEvent extends EventName>(
  userId: string,
  event: TEvent,
  payload: EventPayload<TEvent>
): boolean {
  const io = getIOIfInitialized();
  if (!io) return false;

  const target = io.to(SOCKET_ROOMS.USER(userId)) as unknown as TypedBroadcastOperator<TEvent>;
  target.emit(event, payload);
  return true;
}

export function emitToProject<TEvent extends EventName>(
  projectId: string,
  event: TEvent,
  payload: EventPayload<TEvent>
): boolean {
  const io = getIOIfInitialized();
  if (!io) return false;

  const target = io.to(SOCKET_ROOMS.PROJECT(projectId)) as unknown as TypedBroadcastOperator<TEvent>;
  target.emit(event, payload);
  return true;
}

export async function addConnectedUsersToProject(
  userIds: readonly string[],
  projectId: string
): Promise<boolean> {
  const io = getIOIfInitialized();
  if (!io) return false;

  await joinUserSocketsToProject(io, userIds, projectId);
  return true;
}
