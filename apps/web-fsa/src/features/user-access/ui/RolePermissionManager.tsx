import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import {
  Badge as ChakraBadge,
  Box,
  Heading,
  HStack,
  NativeSelect,
  Separator,
  SimpleGrid,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { useLanguage } from "@/features/language/model";
import { updateUser as updateAuthUser } from "@/features/auth/model/authSlice";
import { useAuth } from "@/features/auth/model/useAuth";
import {
  useGetRolesAndPermissionsQuery,
  useUpdateUserMutation,
} from "@/entities/user/api/usersApi";
import type { Permission, Role, User, UserStatus } from "@/shared/types";
import { getPermissionsFromRoleCatalog } from "@/entities/permission/model/permissionGrants";
import { getApiErrorMessage } from "@/shared/lib/getApiErrorMessage";
import Badge from "@/shared/ui/primitives/Badge";
import Button from "@/shared/ui/primitives/Button";
import Card from "@/shared/ui/primitives/Card";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";

const userStatuses: UserStatus[] = ["Active", "Inactive"];

const statusStyles: Record<
  UserStatus,
  { bg: string; color: string; borderColor: string }
> = {
  Active: {
    bg: "var(--apple-success-bg)",
    color: "var(--apple-success-text)",
    borderColor: "rgba(29, 127, 67, 0.18)",
  },
  Inactive: {
    bg: "var(--apple-danger-bg)",
    color: "var(--apple-danger-text)",
    borderColor: "rgba(180, 35, 24, 0.2)",
  },
};

function getStatusLabel(status: UserStatus, t: ReturnType<typeof useLanguage>["t"]) {
  return status === "Inactive" ? t("common.inactive") : t("common.active");
}

function toggleValue<T extends string>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function RolePermissionManager({ users }: { users: User[] }) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || "");
  const selectedUser = users.find((user) => user.id === selectedUserId) || users[0];
  const editorKey = JSON.stringify([
    selectedUser?.id,
    selectedUser?.roles,
    selectedUser?.permissions,
    selectedUser?.status,
  ]);

  return (
    <RolePermissionEditor
      key={editorKey}
      users={users}
      selectedUser={selectedUser}
      onSelectUser={setSelectedUserId}
    />
  );
}

function RolePermissionEditor({
  users,
  selectedUser,
  onSelectUser,
}: {
  users: User[];
  selectedUser: User | undefined;
  onSelectUser: (userId: string) => void;
}) {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const {
    data: rolesAndPermissions,
    error: rolesError,
    isLoading: isLoadingRoles,
    isFetching: isFetchingRoles,
  } = useGetRolesAndPermissionsQuery();
  const roleCatalog = rolesAndPermissions?.roles || [];
  const allRoles = roleCatalog.map((role) => role.key);
  const allPermissions = useMemo(
    () => rolesAndPermissions?.permissions || [],
    [rolesAndPermissions?.permissions]
  );
  const roleLabels = Object.fromEntries(
    roleCatalog.map((role) => [role.key, role.name])
  ) as Record<Role, string>;

  const [draftRoles, setDraftRoles] = useState<Role[]>(selectedUser?.roles || []);
  const [draftPermissions, setDraftPermissions] = useState<Permission[]>(
    selectedUser?.permissions || []
  );
  const [draftStatus, setDraftStatus] = useState<UserStatus>(
    selectedUser?.status || "Active"
  );
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const groupedPermissions = useMemo(() => {
    return allPermissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      const group = permission.split(".")[0];
      groups[group] = groups[group] || [];
      groups[group].push(permission);
      return groups;
    }, {});
  }, [allPermissions]);

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
  };

  const handleToggleRole = (role: Role) => {
    const nextRoles = toggleValue(draftRoles, role);
    setDraftRoles(nextRoles);
    setDraftPermissions(getPermissionsFromRoleCatalog(nextRoles, roleCatalog));
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    if (draftRoles.length === 0) {
      toast.error("Select at least one role before saving.");
      return;
    }

    try {
      const updatedUser = await updateUser({
        id: selectedUser.id,
        roles: draftRoles,
        permissions: draftPermissions,
        status: draftStatus,
      }).unwrap();
      if (currentUser?.id === updatedUser.id) {
        dispatch(updateAuthUser(updatedUser));
      }
      setDraftRoles(updatedUser.roles || draftRoles);
      setDraftPermissions(updatedUser.permissions || draftPermissions);
      setDraftStatus(updatedUser.status || draftStatus);
      toast.success(t("userAccess.saveSuccess"));
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, t("userAccess.saveError")));
    }
  };

  if (isLoadingRoles) {
    return <LoadingScreen text="Loading roles and permissions..." />;
  }

  if (rolesError) {
    return <ErrorState error={rolesError} />;
  }

  if (roleCatalog.length === 0) {
    return (
      <Card title={t("userAccess.title")}>
        <EmptyState
          title="No roles loaded"
          description="The backend /users/roles endpoint did not return any roles."
        />
      </Card>
    );
  }

  if (!selectedUser) {
    return (
      <Card title={t("userAccess.title")}>
        <Text>{t("userAccess.empty")}</Text>
      </Card>
    );
  }

  return (
    <Card title={t("userAccess.title")}>
      <SimpleGrid
        columns={{ base: 1, lg: 2 }}
        templateColumns={{ base: "1fr", lg: "280px 1fr" }}
        gap={6}
      >
        <Box
          borderRight={{ base: 0, lg: "1px solid" }}
          borderBottom={{ base: "1px solid", lg: 0 }}
          borderColor="var(--apple-border-soft)"
          pr={{ base: 0, lg: 4 }}
          pb={{ base: 4, lg: 0 }}
        >
          <Heading as="h3" size="sm" mb={4}>
            {t("userAccess.users")}
          </Heading>
          <VStack align="stretch" gap={3}>
            {users.map((user) => (
              <Box
                as="button"
                key={user.id}
                onClick={() => handleSelectUser(user.id)}
                textAlign="left"
                p={4}
                border="1px solid"
                borderColor={
                  user.id === selectedUser.id
                    ? "var(--apple-blue-border-strong)"
                    : "var(--apple-border)"
                }
                bg={user.id === selectedUser.id ? "var(--apple-blue-soft)" : "var(--apple-surface)"}
                borderRadius="md"
                _hover={{
                  borderColor: "var(--apple-blue-border)",
                  bg: "var(--apple-blue-soft)",
                }}
              >
                <HStack justify="space-between" align="start" gap={2}>
                  <Text fontWeight="800">
                    {user.firstName} {user.lastName}
                  </Text>
                  <ChakraBadge
                    {...statusStyles[user.status || "Active"]}
                    border="1px solid"
                    borderRadius="full"
                    px={2}
                    textTransform="none"
                  >
                    {getStatusLabel(user.status || "Active", t)}
                  </ChakraBadge>
                </HStack>
                <Text color="var(--apple-secondary)" fontSize="sm">
                  {user.username}
                </Text>
                <Text color="var(--apple-muted)" fontSize="xs">
                  {user.roles.join(", ")}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>

        <VStack align="stretch" gap={6}>
          <HStack justify="space-between" align="start" flexWrap="wrap">
            <Box>
              <Heading as="h3" size="md">
                {selectedUser.name}
              </Heading>
              <Text color="var(--apple-secondary)">{selectedUser.username}</Text>
            </Box>
            <Button
              onClick={handleSave}
              disabled={isFetchingRoles || isLoading}
              isLoading={isLoading}
              loadingText={t("common.loading")}
            >
              {t("common.saveAccess")}
            </Button>
          </HStack>

          <Box>
            <Heading as="h4" size="sm" mb={3}>
              {t("userAccess.userState")}
            </Heading>
            <NativeSelect.Root maxW="260px">
              <NativeSelect.Field
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value as UserStatus)}
                borderRadius="md"
                bg="var(--apple-surface)"
                borderColor="var(--apple-border)"
                _focusVisible={{
                  borderColor: "var(--apple-blue)",
                  boxShadow: "var(--focus-ring)",
                }}
              >
                {userStatuses.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status, t)}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          <Box>
            <Heading as="h4" size="sm" mb={3}>
              {t("userAccess.roles")}
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              {allRoles.map((role) => (
                <Box
                  as="label"
                  key={role}
                  display="flex"
                  alignItems="center"
                  gap={3}
                  p={3}
                  border="1px solid"
                  borderColor="var(--apple-border)"
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: "var(--apple-surface-hover)" }}
                >
                  <input
                    type="checkbox"
                    disabled={isLoading}
                    checked={draftRoles.includes(role)}
                    onChange={() => handleToggleRole(role)}
                  />
                  <Text fontWeight="600">{roleLabels[role] || role}</Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          <Separator />

          <Box>
            <Heading as="h4" size="sm" mb={2}>
              {t("userAccess.directPermissions")}
            </Heading>
            <Text color="var(--apple-secondary)" mb={4}>
              {t("userAccess.permissionsHelp")}
            </Text>
            <VStack align="stretch" gap={4}>
              {Object.entries(groupedPermissions).map(([group, permissions]) => (
                <Box
                  key={group}
                  border="1px solid"
                  borderColor="var(--apple-border)"
                  borderRadius="md"
                  p={4}
                >
                  <Heading as="h5" size="xs" textTransform="capitalize" mb={3}>
                    {group}
                  </Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                    {permissions.map((permission) => (
                      <Box
                        as="label"
                        key={permission}
                        display="flex"
                        alignItems="center"
                        gap={3}
                        p={2}
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: "var(--apple-surface-hover)" }}
                      >
                        <input
                          type="checkbox"
                          disabled={isLoading}
                          checked={draftPermissions.includes(permission)}
                          onChange={() =>
                            setDraftPermissions(toggleValue(draftPermissions, permission))
                          }
                        />
                        <Text fontSize="sm">{permission}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                </Box>
              ))}
            </VStack>
          </Box>

          <Wrap>
            {draftPermissions.map((permission) => (
              <WrapItem key={permission}>
                <Badge>{permission}</Badge>
              </WrapItem>
            ))}
          </Wrap>
        </VStack>
      </SimpleGrid>
    </Card>
  );
}
