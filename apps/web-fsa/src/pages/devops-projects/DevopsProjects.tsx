import {
  Badge,
  Box,
  CloseButton,
  Drawer,
  HStack,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import DevopsWorkspace from "@/entities/devops/ui/DevopsWorkspace";
import ProjectProvisioningPanel from "@/entities/devops/ui/ProjectProvisioningPanel";
import { useGetProjectsQuery } from "@/entities/project/api/projectsApi";
import { getDevopsTableActionLabel } from "@/entities/project/model/provisioning";
import ProjectTableBase from "@/entities/project/ui/table/ProjectTableBase";
import { projectTableColumns } from "@/entities/project/ui/table/columns";
import type {
  ProjectTableColumn,
  ProjectTableRow,
} from "@/entities/project/ui/table/types";
import { useLanguage } from "@/features/language/model";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import PageHeader from "@/shared/ui/layout/PageHeader";

const devopsActionColumn: ProjectTableColumn = {
  key: "phase",
  label: "Available action",
  minW: "180px",
  render: (project) => (
    <Badge
      colorPalette={
        project.provisioningStatus === "DEVOPS_READY"
          ? "green"
          : project.provisioningStatus === "DEVOPS_BLOCKED"
            ? "red"
            : "blue"
      }
      borderRadius="full"
      px={2.5}
      py={1}
      textTransform="none"
    >
      {getDevopsTableActionLabel(project.provisioningStatus)}
    </Badge>
  ),
};

const columns: ProjectTableColumn[] = [
  projectTableColumns.summary,
  projectTableColumns.discipline,
  projectTableColumns.dueDate,
  projectTableColumns.provisioningStatus,
  projectTableColumns.projectManager,
  projectTableColumns.labRepresentative,
  devopsActionColumn,
];

export default function DevopsProjects() {
  const { dir } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const { data: projects = [], error, isLoading } = useGetProjectsQuery("devops");
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );
  const openWorkspace = (project: ProjectTableRow) => setSelectedProjectId(project.id);
  const closeWorkspace = () => setSelectedProjectId(undefined);

  return (
    <VStack align="stretch" gap={5} dir={dir}>
      <PageHeader
        eyebrow="DEVOPS"
        title="DevOps Projects"
        description="Prepare, test, approve, or report environment setup problems for projects assigned to you."
      />

      {isLoading && <LoadingScreen text="Loading assigned DevOps projects..." />}
      {error && (
        <Box
          bg="var(--apple-surface-raised)"
          border="1px solid"
          borderColor="var(--apple-border)"
          borderRadius="xl"
          p={2}
        >
          <ErrorState error={error} />
        </Box>
      )}
      {!isLoading && !error && (
        <ProjectTableBase
          paginationId="devops-projects"
          title="Assigned DevOps projects"
          emptyTitle="No DevOps projects are assigned to you"
          projects={projects}
          columns={columns}
          actionLabel="Open workspace"
          onAction={openWorkspace}
          onRowDoubleClick={openWorkspace}
        />
      )}

      <Drawer.Root
        open={Boolean(selectedProject)}
        onOpenChange={(event) => {
          if (!event.open) closeWorkspace();
        }}
        placement="end"
        size="full"
      >
        <Portal>
          <Drawer.Backdrop bg="blackAlpha.500" />
          <Drawer.Positioner>
            <Drawer.Content bg="var(--apple-surface-raised)" dir={dir}>
              <Drawer.Header
                borderBottom="1px solid"
                borderColor="var(--apple-border-soft)"
                py={5}
              >
                <Box>
                  <Drawer.Title fontSize="lg" fontWeight="850">
                    DevOps environment workspace
                  </Drawer.Title>
                  <HStack gap={2} mt={1} flexWrap="wrap">
                    <Text color="var(--apple-muted)" fontSize="sm">
                      {selectedProject?.name}
                    </Text>
                    {selectedProject && (
                      <Badge borderRadius="full" textTransform="none">
                        {selectedProject.discipline}
                      </Badge>
                    )}
                  </HStack>
                </Box>
              </Drawer.Header>
              <Drawer.Body p={{ base: 4, md: 6 }} overflowY="auto">
                {selectedProject && (
                  <VStack
                    key={selectedProject.id}
                    align="stretch"
                    gap={5}
                    maxW="1180px"
                    mx="auto"
                  >
                    <ProjectProvisioningPanel project={selectedProject} />
                    <DevopsWorkspace projectId={selectedProject.id} />
                  </VStack>
                )}
              </Drawer.Body>
              <Drawer.CloseTrigger asChild>
                <CloseButton position="absolute" top="4" insetEnd="4" />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </VStack>
  );
}
