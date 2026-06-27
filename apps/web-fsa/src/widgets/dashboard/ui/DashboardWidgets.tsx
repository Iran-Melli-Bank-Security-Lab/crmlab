import { Link } from "react-router-dom";
import type { ComponentType } from "react";
import { Box, HStack, SimpleGrid, Stat, Text, VStack } from "@chakra-ui/react";
import { PERMISSIONS } from "@/entities/permission/model/permissions";
import { useGetProjectsQuery } from "@/entities/project/api/projectsApi";
import { projectViewRegistry } from "@/entities/project/model/projectViewRegistry";
import { useGetUsersQuery } from "@/entities/user/api/usersApi";
import PermissionGate from "@/features/access-control/ui/PermissionGate";
import { useLanguage } from "@/features/language/model";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import Button from "@/shared/ui/primitives/Button";
import Card from "@/shared/ui/primitives/Card";
import type { User } from "@/shared/types";
import type { ProjectListView } from "@/shared/types/api/projects";
import type { DashboardWidgetId } from "@/widgets/dashboard/model/dashboardWidgetRegistry";

const appleBlue = "var(--apple-blue)";
const appleText = "var(--apple-text)";
const appleMuted = "var(--apple-muted)";

function getUsersList(response: unknown): User[] {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];

  const value = response as {
    users?: unknown;
    items?: unknown;
    data?: unknown;
    results?: unknown;
  };
  if (Array.isArray(value.users)) return value.users as User[];
  if (Array.isArray(value.items)) return value.items as User[];
  if (Array.isArray(value.data)) return value.data as User[];
  if (Array.isArray(value.results)) return value.results as User[];

  return [];
}

function useProjectCount(view: ProjectListView) {
  const { data = [] } = useGetProjectsQuery(view);
  return data.length;
}

function AdminPlatformWidget() {
  const { t } = useLanguage();
  const projectCount = useProjectCount("admin");

  return (
    <Card title={t("dashboard.widgets.adminPlatform.title")} accentColor={appleBlue}>
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <Stat.Root>
          <Stat.Label color={appleMuted} fontWeight="800">{t("dashboard.widgets.adminPlatform.projects")}</Stat.Label>
          <Stat.ValueText color={appleText} fontWeight="850">{projectCount}</Stat.ValueText>
          <Stat.HelpText color={appleMuted}>{t("dashboard.widgets.adminPlatform.createdByYou")}</Stat.HelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label color={appleMuted} fontWeight="800">{t("dashboard.widgets.adminPlatform.projectViews")}</Stat.Label>
          <Stat.ValueText color={appleText} fontWeight="850">{projectViewRegistry.length}</Stat.ValueText>
          <Stat.HelpText color={appleMuted}>{t("dashboard.widgets.adminPlatform.permissionBased")}</Stat.HelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label color={appleMuted} fontWeight="800">{t("dashboard.widgets.adminPlatform.adminScope")}</Stat.Label>
          <Stat.ValueText color={appleText} fontWeight="850">{t("dashboard.widgets.adminPlatform.all")}</Stat.ValueText>
          <Stat.HelpText color={appleMuted}>{t("dashboard.widgets.adminPlatform.systemWide")}</Stat.HelpText>
        </Stat.Root>
      </SimpleGrid>
    </Card>
  );
}

function AdminUsersWidget() {
  const { t } = useLanguage();
  const { data: usersResponse, isLoading, error } = useGetUsersQuery();
  const users = getUsersList(usersResponse);
  const restrictedUsers = users.filter((user) => user.status === "Inactive").length;

  return (
    <Card title={t("adminUsers.title")} accentColor={appleBlue}>
      {isLoading && <LoadingScreen text={t("adminUsers.loading")} />}
      {error && <ErrorState error={error} />}
      {!isLoading && !error && (
        <VStack align="stretch" gap={4}>
          <HStack gap={6} flexWrap="wrap">
            <Stat.Root minW="130px">
              <Stat.Label color={appleMuted} fontWeight="800">{t("dashboard.widgets.adminUsers.total")}</Stat.Label>
              <Stat.ValueText color={appleText} fontWeight="850">{users.length}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root minW="130px">
              <Stat.Label color={appleMuted} fontWeight="800">{t("dashboard.widgets.adminUsers.restricted")}</Stat.Label>
              <Stat.ValueText color={appleText} fontWeight="850">{restrictedUsers}</Stat.ValueText>
            </Stat.Root>
          </HStack>
          <Box>
            <Text color={appleMuted} mb={4}>
              {t("dashboard.widgets.adminUsers.description")}
            </Text>
            <Button asChild>
              <Link to="/admin/users">{t("dashboard.widgets.adminUsers.manage")}</Link>
            </Button>
          </Box>
        </VStack>
      )}
    </Card>
  );
}

function SecurityReviewWidget() {
  const { t } = useLanguage();
  return (
    <Card title={t("dashboard.widgets.security.title")} accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        {t("dashboard.widgets.security.description")}
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=security">{t("dashboard.widgets.security.open")}</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.SECURITY_PROJECTS_ASSIGN]}>
          <Button>{t("dashboard.widgets.security.assign")}</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function PentestWorkWidget() {
  const { t } = useLanguage();
  const projectCount = useProjectCount("pentest");

  return (
    <Card title={t("dashboard.widgets.pentest.title")} accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        {t("dashboard.widgets.pentest.description", { count: projectCount })}
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=pentest">{t("dashboard.widgets.pentest.open")}</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.PENTEST_VULNERABILITIES_CREATE]}>
          <Button>{t("dashboard.widgets.pentest.addVulnerability")}</Button>
        </PermissionGate>
        <PermissionGate permissions={[PERMISSIONS.PENTEST_REPORTS_EXPORT]}>
          <Button variant="secondary">{t("dashboard.widgets.pentest.exportReport")}</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function DevOpsDeliveryWidget() {
  const { t } = useLanguage();
  return (
    <Card title={t("dashboard.widgets.devops.title")} accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        {t("dashboard.widgets.devops.description")}
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=devops">{t("dashboard.widgets.devops.open")}</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.DEVOPS_DEPLOYMENTS_CREATE]}>
          <Button>{t("dashboard.widgets.devops.start")}</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function QualityReviewWidget() {
  const { t } = useLanguage();
  return (
    <Card title={t("dashboard.widgets.quality.title")} accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        {t("dashboard.widgets.quality.description")}
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=quality">{t("dashboard.widgets.quality.open")}</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.QUALITY_PROJECTS_ASSIGN]}>
          <Button>{t("dashboard.widgets.security.assign")}</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function QaWorkWidget() {
  const { t } = useLanguage();
  return (
    <Card title={t("dashboard.widgets.qa.title")} accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        {t("dashboard.widgets.qa.description")}
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=qa">{t("dashboard.widgets.qa.open")}</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.QA_TEST_CASES_CREATE]}>
          <Button>{t("dashboard.widgets.qa.create")}</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function RepresentativeWorkWidget() {
  const { t } = useLanguage();
  return (
    <Card title={t("dashboard.widgets.customer.title")} accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        {t("dashboard.widgets.customer.description")}
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=representative">{t("dashboard.widgets.customer.open")}</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.REPRESENTATIVE_TICKETS_CREATE]}>
          <Button>{t("dashboard.widgets.customer.create")}</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

export const dashboardWidgetComponents: Record<DashboardWidgetId, ComponentType> = {
  "admin-platform": AdminPlatformWidget,
  "admin-users": AdminUsersWidget,
  "security-review": SecurityReviewWidget,
  "pentest-work": PentestWorkWidget,
  "devops-delivery": DevOpsDeliveryWidget,
  "quality-review": QualityReviewWidget,
  "qa-work": QaWorkWidget,
  "representative-work": RepresentativeWorkWidget,
};

export function EmptyDashboardState() {
  const { t } = useLanguage();
  return (
    <Card>
      <EmptyState
        title={t("dashboard.emptyTitle")}
        description={t("dashboard.emptyDescription")}
      />
    </Card>
  );
}
