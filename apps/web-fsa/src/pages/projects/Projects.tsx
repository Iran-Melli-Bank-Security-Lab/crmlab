import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, chakra, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { hasAnyExplicitPermissionGrant } from "@/entities/permission/model/permissionGrants";
import { useGetProjectsQuery } from "@/entities/project/api/projectsApi";
import { projectViewRegistry } from "@/entities/project/model/projectViewRegistry";
import { projectTableViewLoaders } from "@/entities/project/ui/table/projectTableViewLoaders";
import { usePermission } from "@/features/access-control/model/usePermission";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import type { Project } from "@/shared/types";

const PentesterAssignmentDock = lazy(
  () => import("@/entities/project/ui/assignment/PentesterAssignmentDock")
);

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { permissions } = usePermission();
  const [assignmentProject, setAssignmentProject] = useState<Project | null>(null);
  const [isAssignmentDockOpen, setIsAssignmentDockOpen] = useState(false);
  const assignmentCloseTimer = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(
    undefined
  );
  const accessibleViews = useMemo(
    () =>
      projectViewRegistry.filter((view) =>
        hasAnyExplicitPermissionGrant(permissions, view.permissions)
      ),
    [permissions]
  );
  const requestedViewId = searchParams.get("view") || searchParams.get("workspace");
  const activeViewId =
    accessibleViews.find((view) => view.id === requestedViewId)?.id ||
    accessibleViews[0]?.id ||
    "empty";
  const activeView = accessibleViews.find((view) => view.id === activeViewId);
  const ActiveProjectTable = activeView
    ? projectTableViewLoaders[activeView.id]
    : undefined;
  const {
    data: activeProjects = [],
    error,
    isLoading,
  } = useGetProjectsQuery(activeView.id, {
    skip: !activeView,
  });

  const selectView = (viewId: string) => {
    setSearchParams({ view: viewId });
  };

  const createFromProject = (project: Project) => {
    const params = new globalThis.URLSearchParams({ sourceProjectId: project.id });
    if (project.projectGroupId) params.set("projectGroupId", project.projectGroupId);
    navigate(`/projects/create?${params.toString()}`);
  };

  const openAssignmentDock = (project: Project) => {
    if (assignmentCloseTimer.current) {
      globalThis.clearTimeout(assignmentCloseTimer.current);
    }

    setAssignmentProject(project);
    setIsAssignmentDockOpen(true);
  };

  const closeAssignmentDock = () => {
    setIsAssignmentDockOpen(false);

    if (assignmentCloseTimer.current) {
      globalThis.clearTimeout(assignmentCloseTimer.current);
    }

    assignmentCloseTimer.current = globalThis.setTimeout(() => {
      setAssignmentProject(null);
      assignmentCloseTimer.current = undefined;
    }, 240);
  };

  useEffect(
    () => () => {
      if (assignmentCloseTimer.current) {
        globalThis.clearTimeout(assignmentCloseTimer.current);
      }
    },
    []
  );

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" align="end" flexWrap="wrap" gap={4}>
        <Box>
          <Badge
            bg="rgba(0, 113, 227, 0.08)"
            color="#0071e3"
            border="1px solid"
            borderColor="rgba(0, 113, 227, 0.16)"
            borderRadius="full"
            px={3}
            py={1}
            mb={3}
            textTransform="none"
            fontWeight="850"
          >
            Permission-based project views
          </Badge>
          <Heading
            color="#1d1d1f"
            fontSize={{ base: "2xl", md: "3xl" }}
            fontWeight="850"
            letterSpacing="0"
            lineHeight="1.12"
          >
            Projects
          </Heading>
          <Text color="#6e6e73" mt={2} fontSize="md">
            Work with the project views allowed by your permissions. Each table is
            scoped to projects assigned to you or created by you.
          </Text>
        </Box>
        <Text color="#6e6e73" fontSize="sm" fontWeight="700">
          {accessibleViews.length} available views
        </Text>
      </HStack>

      {accessibleViews.length > 1 && (
        <HStack
          gap={2}
          flexWrap="wrap"
          bg="rgba(255, 255, 255, 0.86)"
          border="1px solid"
          borderColor="rgba(0, 0, 0, 0.12)"
          borderRadius="md"
          p={2}
          boxShadow="0 1px 2px rgba(0, 0, 0, 0.04)"
          backdropFilter="blur(18px)"
        >
          {accessibleViews.map((view) => {
            const selected = view.id === activeViewId;
            return (
              <chakra.button
                key={view.id}
                type="button"
                onClick={() => selectView(view.id)}
                minH="38px"
                px={4}
                borderRadius="md"
                bg={selected ? "#1d1d1f" : "transparent"}
                color={selected ? "white" : "gray.700"}
                fontSize="sm"
                fontWeight="800"
                boxShadow={selected ? "0 1px 2px rgba(0, 0, 0, 0.14)" : "none"}
                transition="background 120ms ease, color 120ms ease, box-shadow 120ms ease"
                _hover={{ bg: selected ? "#1d1d1f" : "rgba(0, 0, 0, 0.05)" }}
                _focusVisible={{ boxShadow: "0 0 0 3px rgba(0, 113, 227, 0.18)" }}
                aria-pressed={selected}
              >
                {view.label}
              </chakra.button>
            );
          })}
        </HStack>
      )}

      {activeView && ActiveProjectTable ? (
        <VStack align="stretch" gap={4}>
          <Box>
            <Heading as="h2" size="lg" color="#1d1d1f" fontWeight="850">
              {activeView.title}
            </Heading>
            <Text color="#6e6e73" mt={2}>
              {activeView.description}
            </Text>
          </Box>
          {isLoading && <LoadingScreen text="Loading projects..." />}
          {error && <ErrorState error={error} />}
          {!isLoading && !error && (
            <Suspense fallback={<LoadingScreen text="Loading project table..." />}>
              <ActiveProjectTable
                title={activeView.tableTitle}
                projects={activeProjects}
                onCreateFromProject={
                  activeView.canCreateFromExisting ? createFromProject : undefined
                }
                onAssignPentesters={
                  activeView.id === "security" ? openAssignmentDock : undefined
                }
              />
            </Suspense>
          )}
        </VStack>
      ) : (
        <EmptyState
          title="No project views available"
          description="Your account does not have permission to view projects yet."
        />
      )}

      {assignmentProject && (
        <Suspense fallback={null}>
          <PentesterAssignmentDock
            key={assignmentProject.id}
            open={isAssignmentDockOpen}
            project={assignmentProject}
            onClose={closeAssignmentDock}
          />
        </Suspense>
      )}
    </VStack>
  );
}
