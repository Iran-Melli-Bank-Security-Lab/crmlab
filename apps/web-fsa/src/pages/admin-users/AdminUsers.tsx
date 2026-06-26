import { Heading, HStack, SimpleGrid, Stat, Text, VStack } from "@chakra-ui/react";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import Card from "@/shared/ui/primitives/Card";
import RolePermissionManager from "@/features/user-access/ui/RolePermissionManager";
import { useGetUsersQuery } from "@/entities/user/api/usersApi";
import type { User } from "@/shared/types";

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

export default function AdminUsers() {
  const { data: usersResponse, isLoading, error } = useGetUsersQuery();
  const users = getUsersList(usersResponse);
  const activeUsers = users.filter((user) => user.status !== "Inactive").length;
  const restrictedUsers = users.filter((user) => user.status === "Inactive").length;
  const adminUsers = users.filter((user) => user.roles?.includes("admin")).length;

  return (
    <VStack align="stretch" gap={5}>
      <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
        <div>
          <Heading>User Management</Heading>
          <Text color="gray.600" mt={2}>
            Manage users, role assignments, permissions, and account states.
          </Text>
        </div>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <Card>
          <Stat.Root>
            <Stat.Label>Total users</Stat.Label>
            <Stat.ValueText>{users.length}</Stat.ValueText>
          </Stat.Root>
        </Card>
        <Card>
          <Stat.Root>
            <Stat.Label>Active users</Stat.Label>
            <Stat.ValueText>{activeUsers}</Stat.ValueText>
          </Stat.Root>
        </Card>
        <Card>
          <Stat.Root>
            <Stat.Label>Restricted users</Stat.Label>
            <Stat.ValueText>{restrictedUsers}</Stat.ValueText>
          </Stat.Root>
        </Card>
      </SimpleGrid>

      {adminUsers > 1 && (
        <Card>
          <Text color="gray.600">
            {adminUsers} users currently have administrator access.
          </Text>
        </Card>
      )}

      {isLoading && <LoadingScreen text="Loading users..." />}
      {error && <ErrorState error={error} />}
      {!isLoading && !error && users.length === 0 && (
        <Card title="User Management">
          <EmptyState
            title="No users loaded"
            description="Connect the backend /users endpoint or enable MSW mocks."
          />
        </Card>
      )}
      {!isLoading && !error && users.length > 0 && (
        <RolePermissionManager users={users} />
      )}
    </VStack>
  );
}
