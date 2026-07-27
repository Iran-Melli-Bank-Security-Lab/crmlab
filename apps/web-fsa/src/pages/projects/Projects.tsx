import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { PERMISSIONS } from "@/entities/permission/model/permissions";
import { useGetProjectsQuery } from "@/entities/project/api/projectsApi";
import { usePermission } from "@/features/access-control/model/usePermission";
import { useLanguage } from "@/features/language/model";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import type { Project } from "@/shared/types";
import PentesterAssignmentDock from "@/entities/project/ui/assignment/PentesterAssignmentDock";
import PageHeader from "@/shared/ui/layout/PageHeader";
import { hasNonDevopsResponsibility } from "@/entities/project/model/provisioning";

const AdminProjectsTable = lazy(
  () => import("@/entities/project/ui/table/views/AdminProjectsTable")
);
const UserProjectsTable = lazy(
  () => import("@/entities/project/ui/table/views/UserProjectsTable")
);

export default function Projects() {
  const { dir, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = usePermission();
  const isAdmin = permissions.includes(PERMISSIONS.ADMIN_SYSTEM_MANAGE);
  const [assignmentProjectId, setAssignmentProjectId] = useState<string | null>(null);
  const [isAssignmentDockOpen, setIsAssignmentDockOpen] = useState(false);
  const assignmentCloseTimer = useRef<
    ReturnType<typeof globalThis.setTimeout> | undefined
  >(undefined);
  const {
    data: projects = [],
    error,
    isLoading,
  } = useGetProjectsQuery(isAdmin ? "admin" : {});
  const assignmentProject = useMemo(
    () => projects.find((project) => project.id === assignmentProjectId),
    [assignmentProjectId, projects]
  );
  const visibleProjects = useMemo(
    () =>
      isAdmin
        ? projects
        : projects.filter((project) => {
            const responsibilities =
              project.responsibilityContext?.responsibilityKeys ||
              project.myResponsibilities ||
              [];
            return hasNonDevopsResponsibility(responsibilities);
          }),
    [isAdmin, projects]
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

  useEffect(() => {
    const search = new globalThis.URLSearchParams(location.search);
    if (!search.has("view") && !search.has("workspace")) return;
    search.delete("view");
    search.delete("workspace");
    navigate({ pathname: "/projects", search: search.toString() }, { replace: true });
  }, [location.search, navigate]);

  return (
    <VStack align="stretch" gap={{ base: 4, md: 5 }} dir={dir}>
      <PageHeader
        eyebrow={t("projects.badge")}
        title={t("projects.title")}
        description={t("projects.description")}
      />

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
          {isAdmin ? (
            <AdminProjectsTable
              view="admin"
              title={t("projectViews.admin.tableTitle")}
              projects={visibleProjects}
              onCreateFromProject={createFromProject}
            />
          ) : (
            <UserProjectsTable
              title={t("projects.tableTitle")}
              projects={visibleProjects}
              onAssignPentesters={openAssignmentDock}
            />
          )}
        </Suspense>
      )}

      <PentesterAssignmentDock
        open={isAssignmentDockOpen}
        project={assignmentProject}
        onClose={closeAssignmentDock}
      />
    </VStack>
  );
}
