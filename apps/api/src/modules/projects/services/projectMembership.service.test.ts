import assert from "node:assert/strict";
import test from "node:test";
import { collectRelatedProjectIds } from "./projectMembership.service";
import { getInitialRooms } from "@/realtime/socket.rooms";
import { SOCKET_ROOMS } from "@/constants/socket";

test("project relationships are deduplicated across direct and assignment sources", () => {
  assert.deepEqual(
    collectRelatedProjectIds(
      [{ _id: "project-1" }, { _id: "project-2" }],
      [
        { projectId: "project-1" },
        { project: "project-3" },
        { projectId: "project-3" },
      ]
    ),
    ["project-1", "project-2", "project-3"]
  );
});

test("empty and malformed relationship rows do not create project memberships", () => {
  assert.deepEqual(
    collectRelatedProjectIds([{ _id: undefined }], [{ projectId: null }]),
    []
  );
});

test("derived project relationships restore realtime project rooms", () => {
  assert.deepEqual(
    getInitialRooms({
      id: "user-1",
      roles: ["pentester"],
      accessibleProjectIds: ["project-1", "project-2"],
    }),
    [
      SOCKET_ROOMS.USER("user-1"),
      SOCKET_ROOMS.ROLE("pentester"),
      SOCKET_ROOMS.PROJECT("project-1"),
      SOCKET_ROOMS.PROJECT("project-2"),
    ]
  );
});
