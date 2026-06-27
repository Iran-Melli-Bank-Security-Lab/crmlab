import { Badge, Box, HStack, Text } from "@chakra-ui/react";
import type {
  ProjectAssignmentStatus,
  ProjectDiscipline,
  ProjectPriority,
  ProjectStatus,
} from "@/shared/types";
import type { TranslationKey } from "@/features/language/model";
import { formatCompactGroupId, formatDate } from "./formatters";
import ProjectSummary from "./ProjectSummary";
import type { ProjectTableColumn } from "./types";

const statusLabelKeys: Record<ProjectStatus, TranslationKey> = {
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
    <HStack gap={3} minW="140px">
      <Box flex="1" h="2" bg="var(--apple-surface-hover)" borderRadius="full" overflow="hidden">
        <Box h="full" width={`${value}%`} bg={palette} borderRadius="full" />
      </Box>
      <Text fontSize="sm" color="var(--apple-secondary)" fontWeight="700" minW="9">
        {value}%
      </Text>
    </HStack>
  );
}

export const projectTableColumns = {
  summary: {
    key: "summary",
    label: "Project",
    labelKey: "projectTable.columns.summary",
    minW: "260px",
    sortable: true,
    render: (project) => <ProjectSummary project={project} />,
    sortValue: (project) => project.name,
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
          px={3}
          py={1}
          textTransform="none"
        >
          {t(assignmentStatusLabelKeys[project.assignmentStatus])}
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
    sortable: true,
    render: (project) => formatDate(project.assignedAt),
    sortValue: (project) =>
      project.assignedAt ? new Date(project.assignedAt).getTime() : 0,
  },
  assignmentDueDate: {
    key: "assignmentDueDate",
    label: "Assignment due",
    labelKey: "projectTable.columns.assignmentDueDate",
    minW: "150px",
    sortable: true,
    render: (project) => formatDate(project.assignmentDueDate),
    sortValue: (project) =>
      project.assignmentDueDate ? new Date(project.assignmentDueDate).getTime() : 0,
  },
  reviewer: { key: "reviewer", label: "Reviewer", labelKey: "projectTable.columns.reviewer", minW: "190px", sortable: true },
  scope: { key: "scope", label: "Scope", labelKey: "projectTable.columns.scope", minW: "240px", sortable: true },
  phase: { key: "phase", label: "Phase", labelKey: "projectTable.columns.phase", minW: "160px", sortable: true },
  submittedItems: {
    key: "submittedItems",
    label: "Submitted",
    labelKey: "projectTable.columns.submittedItems",
    minW: "120px",
    align: "end",
    sortable: true,
  },
  client: { key: "client", label: "Client", labelKey: "projectTable.columns.client", minW: "160px", sortable: true },
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
        px={3}
        py={1}
        textTransform="none"
      >
        {t(statusLabelKeys[project.status])}
      </Badge>
    ),
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
        px={3}
        py={1}
        textTransform="none"
      >
        {t(priorityLabelKeys[project.priority])}
      </Badge>
    ),
  },
  owner: { key: "owner", label: "Owner", labelKey: "projectTable.columns.owner", minW: "190px", sortable: true },
  assignee: { key: "assignee", label: "Assignee", labelKey: "projectTable.columns.assignee", minW: "180px", sortable: true },
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
  version: { key: "version", label: "Version", labelKey: "projectTable.columns.version", minW: "110px", sortable: true },
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
    render: (project) => project.platform || "-",
  },
  dueDate: {
    key: "dueDate",
    label: "Due",
    labelKey: "projectTable.columns.dueDate",
    minW: "130px",
    sortable: true,
    render: (project) => formatDate(project.dueDate),
    sortValue: (project) => new Date(project.dueDate).getTime(),
  },
  testExpiresAt: {
    key: "testExpiresAt",
    label: "Test expires",
    labelKey: "projectTable.columns.testExpiresAt",
    minW: "140px",
    sortable: true,
    render: (project) => formatDate(project.testExpiresAt),
    sortValue: (project) =>
      project.testExpiresAt ? new Date(project.testExpiresAt).getTime() : 0,
  },
  createdAt: {
    key: "createdAt",
    label: "Created",
    labelKey: "projectTable.columns.createdAt",
    minW: "130px",
    sortable: true,
    render: (project) => formatDate(project.createdAt),
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
    sortable: true,
  },
  vulnerabilities: {
    key: "vulnerabilities",
    label: "Findings",
    labelKey: "projectTable.columns.vulnerabilities",
    minW: "110px",
    align: "end",
    sortable: true,
  },
  testCoverage: {
    key: "testCoverage",
    label: "Coverage",
    labelKey: "projectTable.columns.testCoverage",
    minW: "130px",
    align: "end",
    sortable: true,
    render: (project) => `${project.testCoverage}%`,
  },
  openBugs: {
    key: "openBugs",
    label: "Open bugs",
    labelKey: "projectTable.columns.openBugs",
    minW: "120px",
    align: "end",
    sortable: true,
  },
  environment: {
    key: "environment",
    label: "Environment",
    labelKey: "projectTable.columns.environment",
    minW: "140px",
    sortable: true,
  },
  repository: { key: "repository", label: "Repository", labelKey: "projectTable.columns.repository", minW: "190px", sortable: true },
  pipeline: { key: "pipeline", label: "Pipeline", labelKey: "projectTable.columns.pipeline", minW: "150px", sortable: true },
  lastActivity: {
    key: "lastActivity",
    label: "Updated",
    labelKey: "projectTable.columns.lastActivity",
    minW: "130px",
    sortable: true,
    render: (project) => formatDate(project.lastActivity),
    sortValue: (project) => new Date(project.lastActivity).getTime(),
  },
} satisfies Record<string, ProjectTableColumn>;

export const projectTablePresets = {
  admin: [
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
  ],
  pentester: [
    projectTableColumns.summary,
    projectTableColumns.assignmentStatus,
    projectTableColumns.priority,
    projectTableColumns.scope,
    projectTableColumns.phase,
    projectTableColumns.riskScore,
    projectTableColumns.vulnerabilities,
    projectTableColumns.assignmentDueDate,
    projectTableColumns.progress,
  ],
  qa: [
    projectTableColumns.summary,
    projectTableColumns.assignmentStatus,
    projectTableColumns.priority,
    projectTableColumns.scope,
    projectTableColumns.phase,
    projectTableColumns.testCoverage,
    projectTableColumns.openBugs,
    projectTableColumns.assignmentDueDate,
    projectTableColumns.progress,
  ],
  devops: [
    projectTableColumns.summary,
    projectTableColumns.status,
    projectTableColumns.priority,
    projectTableColumns.environment,
    projectTableColumns.repository,
    projectTableColumns.pipeline,
    projectTableColumns.lastActivity,
  ],
  securityManager: [
    projectTableColumns.summary,
    projectTableColumns.status,
    projectTableColumns.priority,
    projectTableColumns.assignee,
    projectTableColumns.riskScore,
    projectTableColumns.vulnerabilities,
    projectTableColumns.dueDate,
  ],
  qualityManager: [
    projectTableColumns.summary,
    projectTableColumns.status,
    projectTableColumns.priority,
    projectTableColumns.assignee,
    projectTableColumns.testCoverage,
    projectTableColumns.openBugs,
    projectTableColumns.dueDate,
  ],
} satisfies Record<string, ProjectTableColumn[]>;
