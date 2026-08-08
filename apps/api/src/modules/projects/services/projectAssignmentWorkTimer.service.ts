import {
  PROJECT_ASSIGNMENT_ROLES,
  PROJECT_ASSIGNMENT_STATUS,
  type ProjectAssignmentStatus,
} from "@/constants/projects";
import { ProjectAssignmentModel } from "../models/projectAssignment.model";

export type WorkTimerStatus = Extract<
  ProjectAssignmentStatus,
  "pending" | "in_progress" | "finished"
>;

export type PentesterTableStatus =
  | "new"
  | "in_progress"
  | "pending"
  | "completed";

export function toPentesterTableStatus(
  value: unknown,
  projectStatus?: unknown
): PentesterTableStatus {
  if (
    projectStatus === PROJECT_ASSIGNMENT_STATUS.FINISHED ||
    projectStatus === "closed"
  ) {
    return "completed";
  }
  if (value === PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS) return "in_progress";
  if (value === PROJECT_ASSIGNMENT_STATUS.PENDING) return "pending";
  if (
    value === PROJECT_ASSIGNMENT_STATUS.FINISHED ||
    value === "closed"
  ) {
    return "completed";
  }
  return "new";
}

export type ProjectAssignmentWorkTimerSnapshot = {
  status: WorkTimerStatus;
  totalWorkTime: number;
  workTimerStartedAt: Date | null;
};

type TransitionResult = ProjectAssignmentWorkTimerSnapshot & {
  changed: boolean;
  sessionElapsedSeconds: number;
  sessionStartedAt: Date;
  transitionTime: Date;
};

function safeTotalWorkTime(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function safeDate(value: unknown) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function elapsedSeconds(startedAt: Date | null, endedAt: Date) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
}

function normalizedStatus(value: unknown): WorkTimerStatus {
  if (value === PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS) return "in_progress";
  if (value === PROJECT_ASSIGNMENT_STATUS.FINISHED) return "finished";
  return "pending";
}

export function toProjectAssignmentWorkTimerSnapshot(
  assignment: {
    status?: unknown;
    totalWorkTime?: unknown;
    workTimerStartedAt?: unknown;
  }
): ProjectAssignmentWorkTimerSnapshot {
  const storedStatus = normalizedStatus(assignment.status);
  const startedAt = safeDate(assignment.workTimerStartedAt);
  // Legacy/corrupt active rows without a usable start timestamp are exposed as
  // pending so the user can explicitly start a new, server-timed session.
  const status =
    storedStatus === PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS && !startedAt
      ? PROJECT_ASSIGNMENT_STATUS.PENDING
      : storedStatus;
  return {
    status,
    totalWorkTime: safeTotalWorkTime(assignment.totalWorkTime),
    workTimerStartedAt:
      status === PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS
        ? startedAt
        : null,
  };
}

export async function transitionProjectAssignmentWorkTimer({
  projectId,
  userId,
  version,
  status,
}: {
  projectId: string;
  userId: string;
  version: string;
  status: WorkTimerStatus;
}): Promise<TransitionResult | null> {
  const transitionTime = new Date();
  const isStarting = status === PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS;
  const safeStoredTotal = {
    $max: [
      0,
      {
        $convert: {
          input: { $ifNull: ["$totalWorkTime", 0] },
          to: "long",
          onError: 0,
          onNull: 0,
        },
      },
    ],
  };
  const validStartedAt = {
    $convert: {
      input: "$workTimerStartedAt",
      to: "date",
      onError: null,
      onNull: null,
    },
  };
  const activeElapsedSeconds = {
    $cond: [
      {
        $and: [
          { $eq: ["$status", PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS] },
          { $ne: [validStartedAt, null] },
        ],
      },
      {
        $floor: {
          $divide: [
            { $max: [0, { $subtract: [transitionTime, validStartedAt] }] },
            1000,
          ],
        },
      },
      0,
    ],
  };
  const update = [
    {
      $set: {
        status,
        totalWorkTime: isStarting
          ? safeStoredTotal
          : { $add: [safeStoredTotal, activeElapsedSeconds] },
        workTimerStartedAt: isStarting
          ? {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS] },
                    { $ne: [validStartedAt, null] },
                  ],
                },
                validStartedAt,
                transitionTime,
              ],
            }
          : null,
        stateChanges: {
          $cond: [
            { $eq: ["$status", status] },
            { $ifNull: ["$stateChanges", []] },
            {
              $concatArrays: [
                { $ifNull: ["$stateChanges", []] },
                [{ state: status, timestamp: transitionTime }],
              ],
            },
          ],
        },
        updatedAt: transitionTime,
        updated_at: transitionTime,
      },
    },
  ];

  const previous = await ProjectAssignmentModel.findOneAndUpdate(
    {
      version,
      status: { $ne: PROJECT_ASSIGNMENT_STATUS.REMOVED },
      $and: [
        { $or: [{ projectId }, { project: projectId }] },
        { $or: [{ userId }, { pentester: userId }] },
        {
          $or: [
            { assignmentRole: PROJECT_ASSIGNMENT_ROLES.PENTESTER },
            { assignmentRole: { $exists: false } },
          ],
        },
      ],
    },
    update,
    { returnDocument: "before", updatePipeline: true }
  );
  if (!previous) return null;

  const previousStatus = normalizedStatus(previous.status);
  const previousStartedAt = safeDate(previous.workTimerStartedAt);
  const previousTotal = safeTotalWorkTime(previous.totalWorkTime);
  const sessionElapsedSeconds =
    !isStarting && previous.status === PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS
      ? elapsedSeconds(previousStartedAt, transitionTime)
      : 0;
  const nextStartedAt = isStarting
    ? previous.status === PROJECT_ASSIGNMENT_STATUS.IN_PROGRESS && previousStartedAt
      ? previousStartedAt
      : transitionTime
    : null;

  return {
    status,
    totalWorkTime: previousTotal + sessionElapsedSeconds,
    workTimerStartedAt: nextStartedAt,
    changed:
      previousStatus !== status ||
      (isStarting && previousStartedAt === null) ||
      (!isStarting && previous.workTimerStartedAt != null),
    sessionElapsedSeconds,
    sessionStartedAt: previousStartedAt || transitionTime,
    transitionTime,
  };
}
