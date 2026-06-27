import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, chakra, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { hasAnyExplicitPermissionGrant } from "@/entities/permission/model/permissionGrants";
import { useGetProjectsQuery } from "@/entities/project/api/projectsApi";
import { projectViewRegistry } from "@/entities/project/model/projectViewRegistry";
import { projectTableViewLoaders } from "@/entities/project/ui/table/projectTableViewLoaders";
import { usePermission } from "@/features/access-control/model/usePermission";
import { useLanguage } from "@/features/language/model";
import type { TranslationKey } from "@/features/language/model";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import type { Project } from "@/shared/types";

const PentesterAssignmentDock = lazy(
  () => import("@/entities/project/ui/assignment/PentesterAssignmentDock")
);

export default function Projects() {
  const { t } = useLanguage();
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
  const projectViewKey = (
    viewId: string,
    field: "label" | "title" | "description" | "tableTitle"
  ) => `projectViews.${viewId}.${field}` as TranslationKey;

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
            bg="var(--apple-blue-soft)"
            color="var(--apple-blue)"
            border="1px solid"
            borderColor="var(--apple-blue-border)"
            borderRadius="full"
            px={3}
            py={1}
            mb={3}
            textTransform="none"
            fontWeight="850"
          >
            {t("projects.badge")}
          </Badge>
          <Heading
            color="var(--apple-text)"
            fontSize={{ base: "2xl", md: "3xl" }}
            fontWeight="850"
            letterSpacing="0"
            lineHeight="1.12"
          >
            {t("projects.title")}
          </Heading>
          <Text color="var(--apple-muted)" mt={2} fontSize="md">
            {t("projects.description")}
          </Text>
        </Box>
        <Text color="var(--apple-muted)" fontSize="sm" fontWeight="700">
          {t("projects.availableViews", { count: accessibleViews.length })}
        </Text>
      </HStack>

      {accessibleViews.length > 1 && (
        <HStack
          gap={2}
          flexWrap="wrap"
          bg="var(--apple-surface-raised)"
          border="1px solid"
          borderColor="var(--apple-border)"
          borderRadius="md"
          p={2}
          boxShadow="var(--surface-shadow)"
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
                bg={selected ? "var(--apple-text)" : "transparent"}
                color={selected ? "var(--apple-surface)" : "var(--apple-secondary)"}
                fontSize="sm"
                fontWeight="800"
                boxShadow={selected ? "0 1px 2px rgba(0, 0, 0, 0.14)" : "none"}
                transition="background 120ms ease, color 120ms ease, box-shadow 120ms ease"
                _hover={{ bg: selected ? "var(--apple-text)" : "var(--apple-surface-hover)" }}
                _focusVisible={{ boxShadow: "var(--focus-ring)" }}
                aria-pressed={selected}
              >
                {t(projectViewKey(view.id, "label"))}
              </chakra.button>
            );
          })}
        </HStack>
      )}

      {activeView && ActiveProjectTable ? (
        <VStack align="stretch" gap={4}>
          <Box>
            <Heading as="h2" size="lg" color="var(--apple-text)" fontWeight="850">
              {t(projectViewKey(activeView.id, "title"))}
            </Heading>
            <Text color="var(--apple-muted)" mt={2}>
              {t(projectViewKey(activeView.id, "description"))}
            </Text>
          </Box>
          {isLoading && <LoadingScreen text={t("projects.loading")} />}
          {error && <ErrorState error={error} />}
          {!isLoading && !error && (
            <Suspense fallback={<LoadingScreen text={t("projects.loadingTable")} />}>
              <ActiveProjectTable
                title={t(projectViewKey(activeView.id, "tableTitle"))}
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
          title={t("projects.emptyTitle")}
          description={t("projects.emptyDescription")}
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
