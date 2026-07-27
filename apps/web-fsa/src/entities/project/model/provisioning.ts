import type { ProjectType } from "@/shared/types/api/projects";

export type ProvisioningStatus =
  | "AWAITING_DEVOPS_SETUP"
  | "DEVOPS_IN_PROGRESS"
  | "DEVOPS_READY"
  | "DEVOPS_BLOCKED";

export function managerRequestFields(type: ProjectType, managerId: string) {
  return type === "security"
    ? { projectManagerId: managerId }
    : { qualityManagerId: managerId };
}

export function getProvisioningUiState(input: {
  status?: ProvisioningStatus;
  isAdmin: boolean;
  isAssignedDevops: boolean;
  isAssignedRepresentative: boolean;
}) {
  const status = input.status || "DEVOPS_READY";
  const canRunDevopsActions = input.isAdmin || input.isAssignedDevops;
  const canRetry = input.isAdmin || input.isAssignedRepresentative;
  return {
    status,
    assignmentDisabled: status !== "DEVOPS_READY",
    canStart:
      canRunDevopsActions && status === "AWAITING_DEVOPS_SETUP",
    canConfirmReady:
      canRunDevopsActions && status === "DEVOPS_IN_PROGRESS",
    canReportBlocked:
      canRunDevopsActions && status === "DEVOPS_IN_PROGRESS",
    canRetry: canRetry && status === "DEVOPS_BLOCKED",
  };
}

export function hasRequiredFailureDetails(
  failureReason: string,
  technicalDescription: string
) {
  return Boolean(failureReason.trim() && technicalDescription.trim());
}

export function hasNonDevopsResponsibility(responsibilities: readonly string[]) {
  return responsibilities.some(
    (responsibility) =>
      responsibility !== "devops" && responsibility !== "devops_manager"
  );
}

export function getDevopsTableActionLabel(status?: ProvisioningStatus) {
  switch (status || "DEVOPS_READY") {
    case "AWAITING_DEVOPS_SETUP":
      return "Start setup";
    case "DEVOPS_IN_PROGRESS":
      return "Continue setup";
    case "DEVOPS_BLOCKED":
      return "Review failed setup";
    case "DEVOPS_READY":
      return "View validated setup";
  }
}
