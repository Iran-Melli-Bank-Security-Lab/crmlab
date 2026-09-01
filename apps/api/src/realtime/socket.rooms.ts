import { SOCKET_ROOMS } from "@/constants/socket";
import type { RealtimeServer } from "./socket.types";

// export async function joinUserSocketsToProject(
//   io: RealtimeServer,
//   userIds: readonly string[],
//   projectId: string
// ): Promise<void> {
//   const projectRoom = SOCKET_ROOMS.PROJECT(projectId);
//   await Promise.all(
//     Array.from(new Set(userIds)).map((userId) =>
//       io.in(SOCKET_ROOMS.USER(userId)).socketsJoin(projectRoom)
//     )
//   );
// }

// export async function removeUserSocketsFromProject(
//   io: RealtimeServer,
//   userIds: readonly string[],
//   projectId: string
// ): Promise<void> {
//   const projectRoom = SOCKET_ROOMS.PROJECT(projectId);
//   await Promise.all(
//     Array.from(new Set(userIds)).map((userId) =>
//       io.in(SOCKET_ROOMS.USER(userId)).socketsLeave(projectRoom)
//     )
//   );
// }

type AuthSocketUser = {
  id: string;
  roles?: string[];
  accessibleProjectIds?: string[];
};

export function getInitialRooms(user: AuthSocketUser): string[] {
  const rooms = [SOCKET_ROOMS.USER(user.id)];

  for (const role of user.roles ?? []) {
    rooms.push(SOCKET_ROOMS.ROLE(role));
  }

  for (const projectId of user.accessibleProjectIds ?? []) {
    rooms.push(SOCKET_ROOMS.PROJECT(projectId));
  }

  return rooms;
}

export async function joinUserSocketsToProject(
  io: RealtimeServer,
  userIds: readonly string[],
  projectId: string
): Promise<void> {
  const projectRoom = SOCKET_ROOMS.PROJECT(projectId);
  await Promise.all(
    Array.from(new Set(userIds)).map((userId) =>
      io.in(SOCKET_ROOMS.USER(userId)).socketsJoin(projectRoom)
    )
  );
}
