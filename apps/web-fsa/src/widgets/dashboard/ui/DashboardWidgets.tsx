import { Link } from "react-router-dom";
import type { ComponentType } from "react";
import { Box, HStack, SimpleGrid, Stat, Text, VStack } from "@chakra-ui/react";
import { PERMISSIONS } from "@/entities/permission/model/permissions";
import { useGetProjectsQuery } from "@/entities/project/api/projectsApi";
import { projectViewRegistry } from "@/entities/project/model/projectViewRegistry";
import { useGetUsersQuery } from "@/entities/user/api/usersApi";
import PermissionGate from "@/features/access-control/ui/PermissionGate";
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
  const projectCount = useProjectCount("admin");

  return (
    <Card title="Platform Overview" accentColor={appleBlue}>
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <Stat.Root>
          <Stat.Label color={appleMuted} fontWeight="800">Projects</Stat.Label>
          <Stat.ValueText color={appleText} fontWeight="850">{projectCount}</Stat.ValueText>
          <Stat.HelpText color={appleMuted}>Created by you</Stat.HelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label color={appleMuted} fontWeight="800">Project views</Stat.Label>
          <Stat.ValueText color={appleText} fontWeight="850">{projectViewRegistry.length}</Stat.ValueText>
          <Stat.HelpText color={appleMuted}>Permission-based</Stat.HelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label color={appleMuted} fontWeight="800">Admin scope</Stat.Label>
          <Stat.ValueText color={appleText} fontWeight="850">All</Stat.ValueText>
          <Stat.HelpText color={appleMuted}>System-wide access</Stat.HelpText>
        </Stat.Root>
      </SimpleGrid>
    </Card>
  );
}

function AdminUsersWidget() {
  const { data: usersResponse, isLoading, error } = useGetUsersQuery();
  const users = getUsersList(usersResponse);
  const restrictedUsers = users.filter((user) => user.status === "Inactive").length;

  return (
    <Card title="User Management" accentColor={appleBlue}>
      {isLoading && <LoadingScreen text="Loading users..." />}
      {error && <ErrorState error={error} />}
      {!isLoading && !error && (
        <VStack align="stretch" gap={4}>
          <HStack gap={6} flexWrap="wrap">
            <Stat.Root minW="130px">
              <Stat.Label color={appleMuted} fontWeight="800">Total users</Stat.Label>
              <Stat.ValueText color={appleText} fontWeight="850">{users.length}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root minW="130px">
              <Stat.Label color={appleMuted} fontWeight="800">Restricted</Stat.Label>
              <Stat.ValueText color={appleText} fontWeight="850">{restrictedUsers}</Stat.ValueText>
            </Stat.Root>
          </HStack>
          <Box>
            <Text color={appleMuted} mb={4}>
              Manage users, roles, permissions, and account state.
            </Text>
            <Button asChild>
              <Link to="/admin/users">Manage Users</Link>
            </Button>
          </Box>
        </VStack>
      )}
    </Card>
  );
}

function SecurityReviewWidget() {
  return (
    <Card title="Security Review" accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        Review security projects, assigned testing work, findings, and reports.
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=security">Open Security Projects</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.SECURITY_PROJECTS_ASSIGN]}>
          <Button>Assign Project</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function PentestWorkWidget() {
  const projectCount = useProjectCount("pentest");

  return (
    <Card title="Pentest Work" accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        {projectCount} assigned pentest projects are available.
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=pentest">Open Pentest Queue</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.PENTEST_VULNERABILITIES_CREATE]}>
          <Button>Add Vulnerability</Button>
        </PermissionGate>
        <PermissionGate permissions={[PERMISSIONS.PENTEST_REPORTS_EXPORT]}>
          <Button variant="secondary">Export Report</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function DevOpsDeliveryWidget() {
  return (
    <Card title="Delivery" accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        Track environments, repositories, pipelines, and deployment activity.
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=devops">Open Delivery Projects</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.DEVOPS_DEPLOYMENTS_CREATE]}>
          <Button>Start Deployment</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function QualityReviewWidget() {
  return (
    <Card title="Quality Review" accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        Assign quality projects, review QA results, and prepare quality reports.
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=quality">Open Quality Projects</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.QUALITY_PROJECTS_ASSIGN]}>
          <Button>Assign Project</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function QaWorkWidget() {
  return (
    <Card title="QA Work" accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        Manage assigned test cases, bug reports, QA cycles, and release checks.
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=qa">Open QA Assignments</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.QA_TEST_CASES_CREATE]}>
          <Button>Create Test Case</Button>
        </PermissionGate>
      </HStack>
    </Card>
  );
}

function RepresentativeWorkWidget() {
  return (
    <Card title="Customer Work" accentColor={appleBlue}>
      <Text color={appleMuted} mb={4}>
        Track customer-facing project status, tickets, and communication workflows.
      </Text>
      <HStack gap={3} flexWrap="wrap">
        <Button asChild variant="secondary">
          <Link to="/projects?view=representative">Open Customer Projects</Link>
        </Button>
        <PermissionGate permissions={[PERMISSIONS.REPRESENTATIVE_TICKETS_CREATE]}>
          <Button>Create Ticket</Button>
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
  return (
    <Card>
      <EmptyState
        title="No dashboard widgets available"
        description="Your account does not have dashboard permissions yet."
      />
    </Card>
  );
}
