import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { PERMISSIONS } from "@/entities/permission/model/permissions";
import { useGetProjectQuery } from "@/entities/project/api/projectsApi";
import { formatCompactGroupId, formatDate } from "@/entities/project/ui/table/formatters";
import { usePermission } from "@/features/access-control/model/usePermission";
import Button from "@/shared/ui/primitives/Button";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import type { Project, ProjectDiscipline, ProjectStatus } from "@/shared/types";

const statusStyles: Record<ProjectStatus, { bg: string; color: string; border: string }> = {
  planning: {
    bg: "var(--apple-surface-hover)",
    color: "var(--apple-secondary)",
    border: "var(--apple-border-soft)",
  },
  active: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    border: "var(--apple-blue-border)",
  },
  blocked: {
    bg: "var(--apple-danger-bg)",
    color: "var(--apple-danger-text)",
    border: "var(--apple-danger-border)",
  },
  review: {
    bg: "var(--apple-warning-bg)",
    color: "var(--apple-warning-text)",
    border: "var(--apple-warning-border)",
  },
  completed: {
    bg: "var(--apple-success-bg)",
    color: "var(--apple-success-text)",
    border: "var(--apple-success-border)",
  },
};

const disciplineLabels: Record<ProjectDiscipline, string> = {
  security: "Security",
  quality: "Quality",
  devops: "DevOps",
  platform: "Platform",
};

function DetailPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      boxShadow="var(--surface-shadow)"
      p={{ base: 5, md: 6 }}
      backdropFilter="blur(18px)"
    >
      <Heading as="h2" size="sm" color="var(--apple-text)" fontWeight="850" mb={4}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

function DetailItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box minW={0}>
      <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800" textTransform="uppercase">
        {label}
      </Text>
      <Text color="var(--apple-text)" fontSize="sm" fontWeight="750" mt={1} wordBreak="break-word">
        {value || "-"}
      </Text>
    </Box>
  );
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const style = statusStyles[status];
  return (
    <Badge
      bg={style.bg}
      color={style.color}
      border="1px solid"
      borderColor={style.border}
      borderRadius="full"
      px={3}
      py={1}
      textTransform="capitalize"
      fontWeight="850"
    >
      {status.replace("_", " ")}
    </Badge>
  );
}

function metricItems(project: Project) {
  return [
    { label: "Progress", value: `${project.progress}%` },
    { label: "Risk score", value: project.riskScore },
    { label: "Findings", value: project.vulnerabilities },
    { label: "Test coverage", value: `${project.testCoverage}%` },
    { label: "Open bugs", value: project.openBugs },
    { label: "Last activity", value: formatDate(project.lastActivity) },
  ];
}

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { hasPermission } = usePermission();
  const {
    data: project,
    error,
    isLoading,
  } = useGetProjectQuery(projectId, {
    skip: !projectId,
  });
  const canOpenPentestWorkspace =
    Boolean(project) &&
    project.discipline === "security" &&
    hasPermission(PERMISSIONS.PENTEST_PROJECTS_READ);

  if (isLoading) {
    return <LoadingScreen text="Loading project..." />;
  }

  if (error) {
    return <ErrorState title="Project unavailable" error={error} />;
  }

  if (!project) {
    return <ErrorState title="Project unavailable" error={{ data: { message: "Project not found" } }} />;
  }

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" align="start" gap={4} flexWrap="wrap">
        <Box minW={0}>
          <HStack gap={2} flexWrap="wrap" mb={3}>
            <Badge
              bg="var(--apple-blue-soft)"
              color="var(--apple-blue)"
              border="1px solid"
              borderColor="var(--apple-blue-border)"
              borderRadius="full"
              px={3}
              py={1}
              textTransform="none"
              fontWeight="850"
            >
              {disciplineLabels[project.discipline]}
            </Badge>
            <ProjectStatusBadge status={project.status} />
          </HStack>
          <Heading
            color="var(--apple-text)"
            fontSize={{ base: "2xl", md: "3xl" }}
            fontWeight="850"
            letterSpacing="0"
            lineHeight="1.12"
          >
            {project.name}
          </Heading>
          <Text color="var(--apple-muted)" mt={2} fontSize="md">
            {project.client} - {project.platform || "No platform"} - Due {formatDate(project.dueDate)}
          </Text>
        </Box>

        <HStack gap={2} flexWrap="wrap">
          <Button variant="secondary" onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
          {canOpenPentestWorkspace && (
            <Button onClick={() => navigate(`/projects/pentest/${project.id}`)}>
              Open workspace
            </Button>
          )}
        </HStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
        {metricItems(project).map((item) => (
          <Box
            key={item.label}
            bg="var(--apple-surface-raised)"
            border="1px solid"
            borderColor="var(--apple-border)"
            borderRadius="md"
            p={4}
            boxShadow="var(--surface-shadow)"
          >
            <DetailItem label={item.label} value={item.value} />
          </Box>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
        <DetailPanel title="Project identity">
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <DetailItem label="Project ID" value={project.id} />
            <DetailItem label="Group" value={formatCompactGroupId(project.projectGroupId)} />
            <DetailItem label="Canonical name" value={project.canonicalName} />
            <DetailItem label="Version" value={project.version} />
            <DetailItem label="Letter number" value={project.letterNumber} />
            <DetailItem label="Created" value={formatDate(project.createdAt)} />
            <DetailItem label="Test expires" value={formatDate(project.testExpiresAt)} />
            <DetailItem label="Priority" value={project.priority} />
          </SimpleGrid>
        </DetailPanel>

        <DetailPanel title="Access and assignment">
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <DetailItem label="Owner" value={project.owner} />
            <DetailItem label="Assignee" value={project.assignee} />
            <DetailItem label="Created by" value={project.createdByUserId} />
            <DetailItem label="Security manager" value={project.securityManagerId} />
            <DetailItem label="Quality manager" value={project.qualityManagerId} />
            <DetailItem label="DevOps assignee" value={project.devopsAssigneeId} />
            <DetailItem label="Representative" value={project.representativeId} />
            <DetailItem
              label="Assigned users"
              value={project.assignedUserIds?.length ? project.assignedUserIds.join(", ") : "-"}
            />
          </SimpleGrid>
        </DetailPanel>
      </SimpleGrid>

      <DetailPanel title="Delivery context">
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          <DetailItem label="Environment" value={project.devopsInfo?.environment || project.environment} />
          <DetailItem label="Repository" value={project.devopsInfo?.repository || project.repository} />
          <DetailItem label="Pipeline" value={project.devopsInfo?.pipeline || project.pipeline} />
          <DetailItem label="Deployment URL" value={project.devopsInfo?.deploymentUrl} />
          <DetailItem label="Release branch" value={project.devopsInfo?.releaseBranch} />
          <DetailItem label="Server inventory" value={project.devopsInfo?.serverInventory} />
        </SimpleGrid>
        {project.devopsInfo?.notes && (
          <Box
            mt={5}
            p={4}
            borderRadius="md"
            bg="var(--apple-surface-subtle)"
            border="1px solid"
            borderColor="var(--apple-border-soft)"
          >
            <DetailItem label="Notes" value={project.devopsInfo.notes} />
          </Box>
        )}
      </DetailPanel>
    </VStack>
  );
}
