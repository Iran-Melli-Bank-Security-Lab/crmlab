import { Badge, Box, HStack, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import type {
  ProjectAssignmentStatus,
  ProjectDiscipline,
  ProjectPriority,
  ProjectStatus,
} from "@/shared/types";
import type { TranslationKey } from "@/features/language/model";
import { formatCompactGroupId, formatDate } from "./formatters";
import ProjectSummary from "./ProjectSummary";
import ProjectResponsibilities from "./ProjectResponsibilities";
import type { ProjectTableColumn } from "./types";

const statusLabelKeys: Record<ProjectStatus, TranslationKey> = {
  new: "projectTable.status.new",
  in_progress: "projectTable.status.inProgress",
  pending: "projectTable.status.pended",
  planning: "projectTable.status.planning",
  active: "projectTable.status.active",
  blocked: "projectTable.status.blocked",
  review: "projectTable.status.review",
  completed: "projectTable.status.completed",
};

const statusStyles: Record<
  ProjectStatus,
  { bg: string; color: string; borderColor: string }
> = {
  new: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    borderColor: "var(--apple-blue-border)",
  },
  in_progress: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    borderColor: "var(--apple-blue-border)",
  },
  pending: {
    bg: "var(--apple-warning-bg)",
    color: "var(--apple-warning-text)",
    borderColor: "var(--apple-warning-border)",
  },
  planning: {
    bg: "var(--apple-surface-hover)",
    color: "var(--apple-secondary)",
    borderColor: "var(--apple-border-soft)",
  },
  active: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    borderColor: "var(--apple-blue-border)",
  },
  blocked: {
    bg: "var(--apple-danger-bg)",
    color: "var(--apple-danger-text)",
    borderColor: "var(--apple-danger-border)",
  },
  review: {
    bg: "var(--apple-surface-hover)",
    color: "var(--apple-secondary)",
    borderColor: "var(--apple-border-soft)",
  },
  completed: {
    bg: "var(--apple-success-bg)",
    color: "var(--apple-success-text)",
    borderColor: "var(--apple-success-border)",
  },
};

const priorityLabelKeys: Record<ProjectPriority, TranslationKey> = {
  low: "projectTable.priority.low",
  medium: "projectTable.priority.medium",
  high: "projectTable.priority.high",
  critical: "projectTable.priority.critical",
};

const priorityStyles: Record<
  ProjectPriority,
  { bg: string; color: string; borderColor: string }
> = {
  low: {
    bg: "var(--apple-surface-hover)",
    color: "var(--apple-secondary)",
    borderColor: "var(--apple-border-soft)",
  },
  medium: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    borderColor: "var(--apple-blue-border)",
  },
  high: {
    bg: "var(--apple-warning-bg)",
    color: "var(--apple-warning-text)",
    borderColor: "var(--apple-warning-border)",
  },
  critical: {
    bg: "var(--apple-danger-bg)",
    color: "var(--apple-danger-text)",
    borderColor: "var(--apple-danger-border)",
  },
};

const assignmentStatusLabelKeys: Record<ProjectAssignmentStatus, TranslationKey> = {
  new: "projectTable.assignment.new",
  pending: "projectTable.assignment.pending",
  completed: "projectTable.assignment.completed",
  assigned: "projectTable.assignment.assigned",
  in_progress: "projectTable.assignment.in_progress",
  submitted: "projectTable.assignment.submitted",
  changes_requested: "projectTable.assignment.changes_requested",
  accepted: "projectTable.assignment.accepted",
};

const assignmentStatusStyles: Record<
  ProjectAssignmentStatus,
  { bg: string; color: string; borderColor: string }
> = {
  new: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    borderColor: "var(--apple-blue-border)",
  },
  pending: {
    bg: "var(--apple-warning-bg)",
    color: "var(--apple-warning-text)",
    borderColor: "var(--apple-warning-border)",
  },
  completed: {
    bg: "var(--apple-success-bg)",
    color: "var(--apple-success-text)",
    borderColor: "var(--apple-success-border)",
  },
  assigned: {
    bg: "var(--apple-surface-hover)",
    color: "var(--apple-secondary)",
    borderColor: "var(--apple-border-soft)",
  },
  in_progress: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    borderColor: "var(--apple-blue-border)",
  },
  submitted: {
    bg: "var(--apple-surface-hover)",
    color: "var(--apple-secondary)",
    borderColor: "var(--apple-border-soft)",
  },
  changes_requested: {
    bg: "var(--apple-warning-bg)",
    color: "var(--apple-warning-text)",
    borderColor: "var(--apple-warning-border)",
  },
  accepted: {
    bg: "var(--apple-success-bg)",
    color: "var(--apple-success-text)",
    borderColor: "var(--apple-success-border)",
  },
};

const disciplineLabelKeys: Record<ProjectDiscipline, TranslationKey> = {
  security: "projectTable.discipline.security",
  quality: "projectTable.discipline.quality",
  devops: "projectTable.discipline.devops",
  platform: "projectTable.discipline.platform",
};

function ProgressMeter({ value }: { value: number }) {
  const palette =
    value >= 80
      ? "var(--apple-text)"
      : value >= 50
        ? "var(--apple-blue)"
        : "var(--apple-muted)";

  return (
    <HStack gap={2.5} minW="125px">
      <Box
        flex="1"
        h="1.5"
        bg="var(--apple-surface-hover)"
        borderRadius="full"
        overflow="hidden"
      >
        <Box h="full" width={`${value}%`} bg={palette} borderRadius="full" />
      </Box>
      <Text
        fontSize="xs"
        color="var(--apple-secondary)"
        fontWeight="750"
        minW="9"
        fontVariantNumeric="tabular-nums"
      >
        {value}%
      </Text>
    </HStack>
  );
}

function DeadlineIndicator({
  dueDate,
  closed,
  enabled,
}: {
  dueDate: string;
  closed: boolean;
  enabled: boolean;
}) {
  const deadline = new Date(dueDate).getTime();
  const remainingHours = (deadline - Date.now()) / 3_600_000;
  const expired = !Number.isFinite(deadline) || remainingHours <= 0;
  const urgent = enabled && !closed && !expired && remainingHours <= 48;
  const near = enabled && !urgent && !closed && !expired && remainingHours <= 168;
  const color = !enabled
    ? "var(--apple-muted)"
    : closed || expired
    ? "var(--apple-danger-text)"
    : urgent || near
      ? "var(--apple-warning-text)"
      : "var(--apple-blue)";
  const label = !enabled
    ? "Deadline disabled"
    : closed || expired
    ? "Closed"
    : remainingHours <= 48
      ? `${Math.max(1, Math.ceil(remainingHours))}h left`
      : `${Math.ceil(remainingHours / 24)}d left`;
  const urgency = closed || expired
    ? 100
    : Math.max(8, Math.min(100, 100 - (remainingHours / 168) * 100));
  const exactDeadline = Number.isFinite(deadline)
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(deadline))
    : formatDate(dueDate);

  return (
    <Box as="details" minW="120px" onClick={(event) => event.stopPropagation()}>
      <Box as="summary" cursor="pointer" listStyle="none" color={color}>
        <HStack justify="space-between" gap={2} mb={1.5}>
          <Text fontSize="xs" fontWeight="850">{label}</Text>
          {urgent && <Text fontSize="2xs" fontWeight="800">≤ 2 days</Text>}
        </HStack>
        <Box h="1.5" bg="var(--apple-surface-hover)" borderRadius="full" overflow="hidden">
          <Box h="full" width={`${urgency}%`} bg={color} borderRadius="full" />
        </Box>
      </Box>
      <Text mt={2} fontSize="xs" color="var(--apple-secondary)">
        {exactDeadline}
      </Text>
    </Box>
  );
}

export const projectTableColumns = {
  summary: {
    key: "summary",
    label: "Project",
    labelKey: "projectTable.columns.summary",
    minW: "260px",
    maxW: "360px",
    sortable: true,
    render: (project) => <ProjectSummary project={project} />,
    sortValue: (project) => project.name,
  },
  myResponsibilities: {
    key: "myResponsibilities",
    label: "My Role",
    labelKey: "projectTable.columns.myResponsibilities",
    minW: "190px",
    maxW: "300px",
    render: (project) => (
      <ProjectResponsibilities
        responsibilities={
          project.responsibilityContext?.responsibilityKeys || project.myResponsibilities
        }
      />
    ),
  },
  assignmentStatus: {
    key: "assignmentStatus",
    label: "Assignment",
    labelKey: "projectTable.columns.assignmentStatus",
    minW: "150px",
    sortable: true,
    render: (project, t) =>
      project.assignmentStatus ? (
        <Badge
          {...assignmentStatusStyles[project.assignmentStatus]}
          border="1px solid"
          borderRadius="full"
          px={2.5}
          py={0.5}
          fontSize="xs"
          fontWeight="750"
          whiteSpace="nowrap"
          textTransform="none"
        >
          <HStack gap={1.5}>
            <Box boxSize="1.5" borderRadius="full" bg="currentColor" />
            <Text as="span">
              {t(assignmentStatusLabelKeys[project.assignmentStatus])}
            </Text>
          </HStack>
        </Badge>
      ) : (
        "-"
      ),
  },
  assignedAt: {
    key: "assignedAt",
    label: "Assigned",
    labelKey: "projectTable.columns.assignedAt",
    minW: "130px",
    kind: "date",
    sortable: true,
    sortValue: (project) =>
      project.assignedAt ? new Date(project.assignedAt).getTime() : 0,
  },
  assignmentDueDate: {
    key: "assignmentDueDate",
    label: "Assignment due",
    labelKey: "projectTable.columns.assignmentDueDate",
    minW: "150px",
    kind: "date",
    sortable: true,
    sortValue: (project) =>
      project.assignmentDueDate ? new Date(project.assignmentDueDate).getTime() : 0,
  },
  reviewer: {
    key: "reviewer",
    label: "Reviewer",
    labelKey: "projectTable.columns.reviewer",
    minW: "190px",
    maxW: "260px",
    kind: "user",
    sortable: true,
  },
  scope: {
    key: "scope",
    label: "Scope",
    labelKey: "projectTable.columns.scope",
    minW: "240px",
    maxW: "380px",
    kind: "longText",
    wrap: true,
    sortable: true,
  },
  phase: {
    key: "phase",
    label: "Phase",
    labelKey: "projectTable.columns.phase",
    minW: "160px",
    sortable: true,
  },
  submittedItems: {
    key: "submittedItems",
    label: "Submitted",
    labelKey: "projectTable.columns.submittedItems",
    minW: "120px",
    align: "end",
    kind: "number",
    sortable: true,
  },
  client: {
    key: "client",
    label: "Client",
    labelKey: "projectTable.columns.client",
    minW: "160px",
    maxW: "240px",
    kind: "text",
    sortable: true,
  },
  discipline: {
    key: "discipline",
    label: "Type",
    labelKey: "projectTable.columns.discipline",
    minW: "130px",
    sortable: true,
    render: (project, t) => t(disciplineLabelKeys[project.discipline]),
  },
  status: {
    key: "status",
    label: "Status",
    labelKey: "projectTable.columns.status",
    minW: "130px",
    sortable: true,
    render: (project, t) => (
      <Badge
        {...statusStyles[project.status]}
        border="1px solid"
        borderRadius="full"
        px={2.5}
        py={0.5}
        fontSize="xs"
        fontWeight="750"
        whiteSpace="nowrap"
        textTransform="none"
      >
        <HStack gap={1.5}>
          <Box boxSize="1.5" borderRadius="full" bg="currentColor" />
          <Text as="span">{t(statusLabelKeys[project.status])}</Text>
        </HStack>
      </Badge>
    ),
  },
  provisioningStatus: {
    key: "provisioningStatus",
    label: "DevOps status",
    minW: "190px",
    sortable: true,
    render: (project) => (
      <Badge
        colorPalette={
          project.provisioningStatus === "DEVOPS_READY"
            ? "green"
            : project.provisioningStatus === "DEVOPS_BLOCKED"
              ? "red"
              : "orange"
        }
        borderRadius="full"
        px={2.5}
        py={0.5}
        textTransform="none"
      >
        {(project.provisioningStatus || "DEVOPS_READY").replace(/_/g, " ")}
      </Badge>
    ),
    sortValue: (project) => project.provisioningStatus || "DEVOPS_READY",
  },
  projectManager: {
    key: "projectManager",
    label: "Project Manager",
    minW: "190px",
    render: (project) =>
      project.securityManagerId || project.qualityManagerId || "—",
  },
  labRepresentative: {
    key: "labRepresentative",
    label: "Lab Representative",
    minW: "190px",
    render: (project) => project.representativeId || "—",
  },
  devopsResponsible: {
    key: "devopsResponsible",
    label: "DevOps Responsible",
    minW: "190px",
    render: (project) => project.devopsAssigneeId || "—",
  },
  devopsFailureReason: {
    key: "devopsFailureReason",
    label: "Setup failure",
    minW: "220px",
    maxW: "360px",
    wrap: true,
    render: (project) => (
      <Text lineClamp={2} title={project.devopsFailureReason}>
        {project.devopsFailureReason || "—"}
      </Text>
    ),
  },
  devopsFailureAt: {
    key: "devopsFailureAt",
    label: "Failure date",
    minW: "140px",
    kind: "date",
    sortable: true,
  },
  priority: {
    key: "priority",
    label: "Priority",
    labelKey: "projectTable.columns.priority",
    minW: "120px",
    sortable: true,
    render: (project, t) => (
      <Badge
        {...priorityStyles[project.priority]}
        border="1px solid"
        borderRadius="full"
        px={2.5}
        py={0.5}
        fontSize="xs"
        fontWeight="750"
        whiteSpace="nowrap"
        textTransform="none"
      >
        <HStack gap={1.5}>
          <Box boxSize="1.5" borderRadius="full" bg="currentColor" />
          <Text as="span">{t(priorityLabelKeys[project.priority])}</Text>
        </HStack>
      </Badge>
    ),
  },
  owner: {
    key: "owner",
    label: "Owner",
    labelKey: "projectTable.columns.owner",
    minW: "190px",
    maxW: "260px",
    kind: "user",
    sortable: true,
  },
  assignee: {
    key: "assignee",
    label: "Assignee",
    labelKey: "projectTable.columns.assignee",
    minW: "180px",
    maxW: "260px",
    kind: "user",
    sortable: true,
  },
  projectGroupId: {
    key: "projectGroupId",
    label: "Group",
    labelKey: "projectTable.columns.projectGroupId",
    minW: "120px",
    sortable: true,
    render: (project) => (
      <Text color="var(--apple-muted)" fontSize="sm" fontWeight="700">
        {formatCompactGroupId(project.projectGroupId)}
      </Text>
    ),
  },
  version: {
    key: "version",
    label: "Version",
    labelKey: "projectTable.columns.version",
    minW: "110px",
    sortable: true,
  },
  letterNumber: {
    key: "letterNumber",
    label: "Letter",
    labelKey: "projectTable.columns.letterNumber",
    minW: "150px",
    sortable: true,
  },
  platform: {
    key: "platform",
    label: "Platform",
    labelKey: "projectTable.columns.platform",
    minW: "120px",
    sortable: true,
  },
  dueDate: {
    key: "dueDate",
    label: "Due",
    labelKey: "projectTable.columns.dueDate",
    minW: "130px",
    kind: "date",
    sortable: true,
    sortValue: (project) => new Date(project.dueDate).getTime(),
    render: (project) => (
      <DeadlineIndicator
        dueDate={project.dueDate}
        closed={project.status === "completed"}
        enabled={project.deadlineEnabled !== false}
      />
    ),
  },
  testExpiresAt: {
    key: "testExpiresAt",
    label: "Test expires",
    labelKey: "projectTable.columns.testExpiresAt",
    minW: "140px",
    kind: "date",
    sortable: true,
    sortValue: (project) =>
      project.testExpiresAt ? new Date(project.testExpiresAt).getTime() : 0,
  },
  createdAt: {
    key: "createdAt",
    label: "Created",
    labelKey: "projectTable.columns.createdAt",
    minW: "130px",
    kind: "date",
    sortable: true,
    sortValue: (project) =>
      project.createdAt ? new Date(project.createdAt).getTime() : 0,
  },
  progress: {
    key: "progress",
    label: "Progress",
    labelKey: "projectTable.columns.progress",
    minW: "170px",
    sortable: true,
    render: (project) => <ProgressMeter value={project.progress} />,
  },
  riskScore: {
    key: "riskScore",
    label: "Risk",
    labelKey: "projectTable.columns.riskScore",
    minW: "90px",
    align: "end",
    kind: "number",
    sortable: true,
  },
  vulnerabilities: {
    key: "vulnerabilities",
    label: "Findings",
    labelKey: "projectTable.columns.vulnerabilities",
    minW: "110px",
    align: "end",
    kind: "number",
    sortable: true,
  },
  securityBugs: {
    key: "securityBugs",
    label: "Bug review",
    labelKey: "projectTable.columns.securityBugs",
    minW: "140px",
    maxW: "180px",
    align: "end",
    render: (project, t) =>
      project.allowedActions?.includes("review-security-bugs") ||
      project.allowedActions?.includes("view-project-bugs") ||
      project.allowedActions?.includes("open-pentest-workspace") ? (
      <Box
        asChild
        display="inline-flex"
        borderRadius="md"
        borderWidth="1px"
        borderColor="var(--apple-blue-border)"
        bg="var(--apple-blue-soft)"
        color="var(--apple-blue)"
        fontSize="sm"
        fontWeight="700"
        px={3}
        py={1.5}
        _hover={{ textDecoration: "none", filter: "brightness(0.97)" }}
      >
        <Link
          to={`/projects/${project.id}/bugs`}
          onClick={(event) => event.stopPropagation()}
        >
          {project.allowedActions?.includes("review-security-bugs")
            ? t("projectTable.reviewBugs")
            : t("projectTable.viewBugs")}
        </Link>
      </Box>
    ) : <Text color="var(--apple-muted)">—</Text>,
  },
  testCoverage: {
    key: "testCoverage",
    label: "Coverage",
    labelKey: "projectTable.columns.testCoverage",
    minW: "130px",
    align: "end",
    kind: "percent",
    sortable: true,
  },
  openBugs: {
    key: "openBugs",
    label: "Open bugs",
    labelKey: "projectTable.columns.openBugs",
    minW: "120px",
    align: "end",
    kind: "number",
    sortable: true,
  },
  environment: {
    key: "environment",
    label: "Environment",
    labelKey: "projectTable.columns.environment",
    minW: "140px",
    maxW: "240px",
    kind: "text",
    sortable: true,
  },
  repository: {
    key: "repository",
    label: "Repository",
    labelKey: "projectTable.columns.repository",
    minW: "190px",
    maxW: "300px",
    kind: "link",
    sortable: true,
  },
  pipeline: {
    key: "pipeline",
    label: "Pipeline",
    labelKey: "projectTable.columns.pipeline",
    minW: "150px",
    maxW: "240px",
    kind: "link",
    sortable: true,
  },
  lastActivity: {
    key: "lastActivity",
    label: "Updated",
    labelKey: "projectTable.columns.lastActivity",
    minW: "130px",
    kind: "date",
    sortable: true,
    sortValue: (project) => new Date(project.lastActivity).getTime(),
  },
  pentestersAction: {
    key: "pentesters",
    label: "Pentesters",
    labelKey: "projectTable.columns.pentesters",
    minW: "150px",
    maxW: "190px",
    align: "end",
  },
  qaUsersAction: {
    key: "qaUsers",
    label: "QA Users",
    labelKey: "projectTable.columns.qaUsers",
    minW: "150px",
    maxW: "190px",
    align: "end",
  },
} satisfies Record<string, ProjectTableColumn>;

export const adminProjectTableColumns: ProjectTableColumn[] = [
  projectTableColumns.summary,
  projectTableColumns.projectGroupId,
  projectTableColumns.version,
  projectTableColumns.letterNumber,
  projectTableColumns.platform,
  projectTableColumns.discipline,
  projectTableColumns.status,
  projectTableColumns.owner,
  projectTableColumns.assignee,
  projectTableColumns.testExpiresAt,
  projectTableColumns.createdAt,
];

/** @deprecated Use adminProjectTableColumns. Non-admin presets are backend-owned. */
export const projectTablePresets = { admin: adminProjectTableColumns };
