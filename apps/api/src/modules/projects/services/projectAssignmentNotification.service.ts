import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from "@/constants/notifications";
import { ROUTES } from "@/constants/routes";
import { createNotifications } from "@/modules/notifications/services/notification.service";

type AssignmentNotificationTarget = {
  assignmentId: string;
  userId: string;
  assignmentRole?: string | null;
};

const roleLabels: Record<string, string> = {
  pentester: "pentester",
  qa: "QA engineer",
  devops: "DevOps engineer",
  manager: "technical manager",
  security_manager: "security manager",
  quality_manager: "quality manager",
  devops_manager: "DevOps manager",
};

export function buildProjectAssignmentNotificationInputs({
  projectId,
  projectName,
  assignedById,
  assignments,
}: {
  projectId: string;
  projectName: string;
  assignedById?: string;
  assignments: readonly AssignmentNotificationTarget[];
}) {
  return assignments.map((assignment) => {
    const role = assignment.assignmentRole || "project member";
    const roleLabel = roleLabels[role] || role.replaceAll("_", " ");
    return {
      userId: assignment.userId,
      projectId,
      type: NOTIFICATION_TYPES.PROJECT_ASSIGNED,
      title: "New project assignment",
      message: `You have been assigned to ${projectName} as ${roleLabel}.`,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      actionUrl: ROUTES.FRONTEND.PROJECT_DETAILS(projectId),
      entityId: projectId,
      dedupeKey: `${NOTIFICATION_TYPES.PROJECT_ASSIGNED}:${assignment.assignmentId}`,
      data: {
        assignmentId: assignment.assignmentId,
        assignmentRole: role,
        assignedById,
      },
    };
  });
}

export async function notifyProjectAssignments(
  input: Parameters<typeof buildProjectAssignmentNotificationInputs>[0]
) {
  return createNotifications(buildProjectAssignmentNotificationInputs(input));
}
