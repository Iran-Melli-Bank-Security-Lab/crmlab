import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import PentesterAssignmentDock from "@/entities/project/ui/assignment/PentesterAssignmentDock";

export default function Projects() {
  const { dir, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { permissions } = usePermission();
  const [assignmentProjectId, setAssignmentProjectId] = useState<string | null>(null);
  const [isAssignmentDockOpen, setIsAssignmentDockOpen] = useState(false);
  const assignmentCloseTimer = useRef<
    ReturnType<typeof globalThis.setTimeout> | undefined
  >(undefined);
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
  const assignmentProject = useMemo(
    () => activeProjects.find((project) => project.id === assignmentProjectId),
    [activeProjects, assignmentProjectId]
  );

  const selectView = useCallback(
    (viewId: string) => {
      setSearchParams({ view: viewId });
    },
    [setSearchParams]
  );

  const createFromProject = useCallback(
    (project: Project) => {
      const params = new globalThis.URLSearchParams({ sourceProjectId: project.id });
      if (project.projectGroupId) params.set("projectGroupId", project.projectGroupId);
      navigate(`/projects/create?${params.toString()}`);
    },
    [navigate]
  );

  const openAssignmentDock = useCallback((project: Project) => {
    if (assignmentCloseTimer.current) {
      globalThis.clearTimeout(assignmentCloseTimer.current);
    }

    setAssignmentProjectId(project.id);
    setIsAssignmentDockOpen(true);
  }, []);
  const projectViewKey = (
    viewId: string,
    field: "label" | "title" | "description" | "tableTitle"
  ) => `projectViews.${viewId}.${field}` as TranslationKey;

  const closeAssignmentDock = useCallback(() => {
    setIsAssignmentDockOpen(false);

    if (assignmentCloseTimer.current) {
      globalThis.clearTimeout(assignmentCloseTimer.current);
    }

    assignmentCloseTimer.current = globalThis.setTimeout(() => {
      setAssignmentProjectId(null);
      assignmentCloseTimer.current = undefined;
    }, 240);
  }, []);

  useEffect(
    () => () => {
      if (assignmentCloseTimer.current) {
        globalThis.clearTimeout(assignmentCloseTimer.current);
      }
    },
    []
  );

  return (
    <VStack align="stretch" gap={{ base: 4, md: 5 }} dir={dir}>
      <HStack justify="space-between" align="end" flexWrap="wrap" gap={3}>
        <Box minW={0}>
          <Badge
            bg="var(--apple-blue-soft)"
            color="var(--apple-blue)"
            border="1px solid"
            borderColor="var(--apple-blue-border)"
            borderRadius="full"
            px={3}
            py={1}
            mb={2}
            textTransform="none"
            fontWeight="850"
          >
            {t("projects.badge")}
          </Badge>
          <Heading
            color="var(--apple-text)"
            fontSize={{ base: "2xl", md: "2.5rem" }}
            fontWeight="850"
            letterSpacing="0"
            lineHeight="1.12"
          >
            {t("projects.title")}
          </Heading>
          <Text color="var(--apple-muted)" mt={1.5} fontSize="sm" maxW="760px">
            {t("projects.description")}
          </Text>
        </Box>
        <Badge
          bg="var(--apple-surface-raised)"
          border="1px solid"
          borderColor="var(--apple-border)"
          borderRadius="full"
          color="var(--apple-secondary)"
          fontSize="xs"
          fontWeight="750"
          px={3}
          py={1.5}
          textTransform="none"
        >
          {t("projects.availableViews", { count: accessibleViews.length })}
        </Badge>
      </HStack>

      {accessibleViews.length > 1 && (
        <HStack
          gap={2}
          overflowX="auto"
          bg="var(--apple-surface-raised)"
          border="1px solid"
          borderColor="var(--apple-border)"
          borderRadius="xl"
          p={2}
          boxShadow="0 1px 2px rgba(0, 0, 0, 0.04)"
          css={{ scrollbarWidth: "thin" }}
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
                flexShrink={0}
                whiteSpace="nowrap"
                borderRadius="lg"
                bg={selected ? "var(--apple-blue)" : "transparent"}
                color={selected ? "white" : "var(--apple-secondary)"}
                fontSize="sm"
                fontWeight="800"
                boxShadow={selected ? "0 2px 6px rgba(0, 113, 227, 0.2)" : "none"}
                transition="background 120ms ease, color 120ms ease, box-shadow 120ms ease"
                _hover={{
                  bg: selected ? "var(--apple-blue-hover)" : "var(--apple-surface-hover)",
                }}
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
        <VStack align="stretch" gap={3}>
          <HStack
            align="start"
            gap={2.5}
            borderInlineStart="2px solid"
            borderColor="var(--apple-blue-border)"
            px={3}
            py={1}
          >
            <Box
              boxSize="1.5"
              borderRadius="full"
              bg="var(--apple-blue)"
              flexShrink={0}
              mt="7px"
            />
            <Text color="var(--apple-muted)" fontSize="sm" lineHeight="1.7">
              {t(projectViewKey(activeView.id, "description"))}
            </Text>
          </HStack>
          {isLoading && (
            <Box borderRadius="xl" overflow="hidden">
              <LoadingScreen text={t("projects.loading")} />
            </Box>
          )}
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

      <PentesterAssignmentDock
        open={isAssignmentDockOpen}
        project={assignmentProject}
        onClose={closeAssignmentDock}
      />
    </VStack>
  );
}
