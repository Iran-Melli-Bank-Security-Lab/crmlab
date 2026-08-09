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
  const canViewPentest = permissions.includes(PERMISSIONS.PENTEST_PROJECTS_READ);
  const canViewSecurity = permissions.includes(PERMISSIONS.SECURITY_PROJECTS_READ);
  const canViewQuality = permissions.includes(PERMISSIONS.QUALITY_PROJECTS_READ);
  const adminQuery = useGetProjectsQuery("admin", { skip: !isAdmin });
  const pentestQuery = useGetProjectsQuery("pentest", {
    skip: isAdmin || !canViewPentest,
  });
  const securityQuery = useGetProjectsQuery("security", {
    skip: isAdmin || !canViewSecurity,
  });
  const qualityQuery = useGetProjectsQuery("quality", {
    skip: isAdmin || !canViewQuality,
  });
  const roleTables = [
    ...(canViewPentest ? [{ view: "pentest" as const, title: t("projectViews.pentest.tableTitle"), query: pentestQuery }] : []),
    ...(canViewSecurity ? [{ view: "security" as const, title: t("projectViews.security.tableTitle"), query: securityQuery }] : []),
    ...(canViewQuality ? [{ view: "quality" as const, title: t("projectViews.quality.tableTitle"), query: qualityQuery }] : []),
  ];
  const projects = isAdmin
    ? adminQuery.data || []
    : Array.from(new Map(roleTables.flatMap(({ query }) => query.data || [])
        .map((project) => [project.id, project])).values());
  const isLoading = isAdmin
    ? adminQuery.isLoading
    : roleTables.some(({ query }) => query.isLoading);
  const error = isAdmin
    ? adminQuery.error
    : roleTables.find(({ query }) => query.error)?.query.error;
  const assignmentProject = useMemo(
    () => projects.find((project) => project.id === assignmentProjectId),
    [assignmentProjectId, projects]
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
              projects={projects}
              onCreateFromProject={createFromProject}
            />
          ) : (
            <VStack align="stretch" gap={{ base: 5, md: 6 }}>
              {roleTables.map(({ view, title, query }) => (
                <UserProjectsTable
                  key={view}
                  view={view}
                  title={title}
                  projects={query.data || []}
                  onAssignPentesters={
                    view === "security"
                      ? openAssignmentDock
                      : view === "quality"
                        ? (project) => navigate(`/projects/${project.id}`)
                        : undefined
                  }
                />
              ))}
            </VStack>
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
