import { Badge, Box, HStack, Text } from "@chakra-ui/react";
import type {
  ProjectAssignmentStatus,
  ProjectDiscipline,
  ProjectPriority,
  ProjectStatus,
} from "@/shared/types";
import { formatCompactGroupId, formatDate } from "./formatters";
import ProjectSummary from "./ProjectSummary";
import type { ProjectTableColumn } from "./types";

const statusLabels: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  blocked: "Blocked",
  review: "In review",
  completed: "Completed",
};

const statusStyles: Record<
  ProjectStatus,
  { bg: string; color: string; borderColor: string }
> = {
  planning: {
    bg: "#f5f5f7",
    color: "#424245",
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  active: {
    bg: "rgba(0, 113, 227, 0.08)",
    color: "#0071e3",
    borderColor: "rgba(0, 113, 227, 0.16)",
  },
  blocked: {
    bg: "#fff1f0",
    color: "#b42318",
    borderColor: "rgba(180, 35, 24, 0.2)",
  },
  review: {
    bg: "#f5f5f7",
    color: "#424245",
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  completed: {
    bg: "#eef8f2",
    color: "#1d7f43",
    borderColor: "rgba(29, 127, 67, 0.18)",
  },
};

const priorityLabels: Record<ProjectPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const priorityStyles: Record<
  ProjectPriority,
  { bg: string; color: string; borderColor: string }
> = {
  low: {
    bg: "#f5f5f7",
    color: "#424245",
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  medium: {
    bg: "rgba(0, 113, 227, 0.08)",
    color: "#0071e3",
    borderColor: "rgba(0, 113, 227, 0.16)",
  },
  high: {
    bg: "#fff8e1",
    color: "#7a5b00",
    borderColor: "rgba(122, 91, 0, 0.18)",
  },
  critical: {
    bg: "#fff1f0",
    color: "#b42318",
    borderColor: "rgba(180, 35, 24, 0.2)",
  },
};

const assignmentStatusLabels: Record<ProjectAssignmentStatus, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  submitted: "Submitted",
  changes_requested: "Changes requested",
  accepted: "Accepted",
};

const assignmentStatusStyles: Record<
  ProjectAssignmentStatus,
  { bg: string; color: string; borderColor: string }
> = {
  assigned: {
    bg: "#f5f5f7",
    color: "#424245",
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  in_progress: {
    bg: "rgba(0, 113, 227, 0.08)",
    color: "#0071e3",
    borderColor: "rgba(0, 113, 227, 0.16)",
  },
  submitted: {
    bg: "#f5f5f7",
    color: "#424245",
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  changes_requested: {
    bg: "#fff8e1",
    color: "#7a5b00",
    borderColor: "rgba(122, 91, 0, 0.18)",
  },
  accepted: {
    bg: "#eef8f2",
    color: "#1d7f43",
    borderColor: "rgba(29, 127, 67, 0.18)",
  },
};

const disciplineLabels: Record<ProjectDiscipline, string> = {
  security: "Security",
  quality: "Quality",
  devops: "DevOps",
  platform: "Platform",
};

function ProgressMeter({ value }: { value: number }) {
  const palette = value >= 80 ? "#1d1d1f" : value >= 50 ? "#0071e3" : "#86868b";

  return (
    <HStack gap={3} minW="140px">
      <Box flex="1" h="2" bg="#ececf0" borderRadius="full" overflow="hidden">
        <Box h="full" width={`${value}%`} bg={palette} borderRadius="full" />
      </Box>
      <Text fontSize="sm" color="#424245" fontWeight="700" minW="9">
        {value}%
      </Text>
    </HStack>
  );
}

export const projectTableColumns = {
  summary: {
    key: "summary",
    label: "Project",
    minW: "260px",
    sortable: true,
    render: (project) => <ProjectSummary project={project} />,
    sortValue: (project) => project.name,
  },
  assignmentStatus: {
    key: "assignmentStatus",
    label: "Assignment",
    minW: "150px",
    sortable: true,
    render: (project) =>
      project.assignmentStatus ? (
        <Badge
          {...assignmentStatusStyles[project.assignmentStatus]}
          border="1px solid"
          borderRadius="full"
          px={3}
          py={1}
          textTransform="none"
        >
          {assignmentStatusLabels[project.assignmentStatus]}
        </Badge>
      ) : (
        "-"
      ),
  },
  assignedAt: {
    key: "assignedAt",
    label: "Assigned",
    minW: "130px",
    sortable: true,
    render: (project) => formatDate(project.assignedAt),
    sortValue: (project) =>
      project.assignedAt ? new Date(project.assignedAt).getTime() : 0,
  },
  assignmentDueDate: {
    key: "assignmentDueDate",
    label: "Assignment due",
    minW: "150px",
    sortable: true,
    render: (project) => formatDate(project.assignmentDueDate),
    sortValue: (project) =>
      project.assignmentDueDate ? new Date(project.assignmentDueDate).getTime() : 0,
  },
  reviewer: { key: "reviewer", label: "Reviewer", minW: "190px", sortable: true },
  scope: { key: "scope", label: "Scope", minW: "240px", sortable: true },
  phase: { key: "phase", label: "Phase", minW: "160px", sortable: true },
  submittedItems: {
    key: "submittedItems",
    label: "Submitted",
    minW: "120px",
    align: "end",
    sortable: true,
  },
  client: { key: "client", label: "Client", minW: "160px", sortable: true },
  discipline: {
    key: "discipline",
    label: "Type",
    minW: "130px",
    sortable: true,
    render: (project) => disciplineLabels[project.discipline],
  },
  status: {
    key: "status",
    label: "Status",
    minW: "130px",
    sortable: true,
    render: (project) => (
      <Badge
        {...statusStyles[project.status]}
        border="1px solid"
        borderRadius="full"
        px={3}
        py={1}
        textTransform="none"
      >
        {statusLabels[project.status]}
      </Badge>
    ),
  },
  priority: {
    key: "priority",
    label: "Priority",
    minW: "120px",
    sortable: true,
    render: (project) => (
      <Badge
        {...priorityStyles[project.priority]}
        border="1px solid"
        borderRadius="full"
        px={3}
        py={1}
        textTransform="none"
      >
        {priorityLabels[project.priority]}
      </Badge>
    ),
  },
  owner: { key: "owner", label: "Owner", minW: "190px", sortable: true },
  assignee: { key: "assignee", label: "Assignee", minW: "180px", sortable: true },
  projectGroupId: {
    key: "projectGroupId",
    label: "Group",
    minW: "120px",
    sortable: true,
    render: (project) => (
      <Text color="#6e6e73" fontSize="sm" fontWeight="700">
        {formatCompactGroupId(project.projectGroupId)}
      </Text>
    ),
  },
  version: { key: "version", label: "Version", minW: "110px", sortable: true },
  letterNumber: {
    key: "letterNumber",
    label: "Letter",
    minW: "150px",
    sortable: true,
  },
  platform: {
    key: "platform",
    label: "Platform",
    minW: "120px",
    sortable: true,
    render: (project) => project.platform || "-",
  },
  dueDate: {
    key: "dueDate",
    label: "Due",
    minW: "130px",
    sortable: true,
    render: (project) => formatDate(project.dueDate),
    sortValue: (project) => new Date(project.dueDate).getTime(),
  },
  testExpiresAt: {
    key: "testExpiresAt",
    label: "Test expires",
    minW: "140px",
    sortable: true,
    render: (project) => formatDate(project.testExpiresAt),
    sortValue: (project) =>
      project.testExpiresAt ? new Date(project.testExpiresAt).getTime() : 0,
  },
  createdAt: {
    key: "createdAt",
    label: "Created",
    minW: "130px",
    sortable: true,
    render: (project) => formatDate(project.createdAt),
    sortValue: (project) =>
      project.createdAt ? new Date(project.createdAt).getTime() : 0,
  },
  progress: {
    key: "progress",
    label: "Progress",
    minW: "170px",
    sortable: true,
    render: (project) => <ProgressMeter value={project.progress} />,
  },
  riskScore: {
    key: "riskScore",
    label: "Risk",
    minW: "90px",
    align: "end",
    sortable: true,
  },
  vulnerabilities: {
    key: "vulnerabilities",
    label: "Findings",
    minW: "110px",
    align: "end",
    sortable: true,
  },
  testCoverage: {
    key: "testCoverage",
    label: "Coverage",
    minW: "130px",
    align: "end",
    sortable: true,
    render: (project) => `${project.testCoverage}%`,
  },
  openBugs: {
    key: "openBugs",
    label: "Open bugs",
    minW: "120px",
    align: "end",
    sortable: true,
  },
  environment: {
    key: "environment",
    label: "Environment",
    minW: "140px",
    sortable: true,
  },
  repository: { key: "repository", label: "Repository", minW: "190px", sortable: true },
  pipeline: { key: "pipeline", label: "Pipeline", minW: "150px", sortable: true },
  lastActivity: {
    key: "lastActivity",
    label: "Updated",
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
