import { Avatar, Box, Button, Flex, Menu, Portal, Spinner, Text } from "@chakra-ui/react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { logout } from "@/features/auth/model/authSlice";
import { useAuth } from "@/features/auth/model/useAuth";
import { useLanguage } from "@/features/language/model";
import { useLogoutUserMutation } from "@/features/auth/api/authApi";
import { ThemeMenuItems } from "@/features/theme/ui/ThemeToggle";

function ProfileIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 21a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4a1.7 1.7 0 0 0 1.87-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.37.31.7.6 1 .3.29.68.5 1.1.6h.1v4h-.1c-.42.1-.8.31-1.1.6-.29.3-.5.68-.6 1.1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M10 17l5-5-5-5M15 12H3M15 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function ProfileMenu() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { t } = useLanguage();
  const [logoutUser, { isLoading }] = useLogoutUserMutation();

  const displayName = user?.name || t("common.user");
  const accountLabel = user?.username
    ? `@${user.username}`
    : roles[0] || t("common.user");

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
    } catch {
      // Local logout should still happen if the session cookie is already expired.
    }
    dispatch(logout());
    toast.success(t("nav.loggedOut"));
    navigate("/login");
  };

  return (
    <Menu.Root
      positioning={{ placement: "bottom-end", gutter: 8 }}
      lazyMount
      unmountOnExit
    >
      <Menu.Trigger asChild>
        <Button
          aria-label={`${t("sidebar.account")}: ${displayName}`}
          bg="transparent"
          border="none"
          borderRadius="full"
          h="46px"
          minW="46px"
          p={0}
          transition="all 0.2s ease"
          variant="ghost"
          _hover={{
            bg: "transparent",
            transform: "scale(1.05)",
          }}
          _open={{
            bg: "transparent",
            transform: "scale(1.05)",
          }}
          _focusVisible={{ boxShadow: "var(--focus-ring)" }}
        >
          <Avatar.Root bg="var(--apple-text)" color="var(--apple-bg)" size="sm">
            <Avatar.Fallback name={displayName} fontWeight="800" />
            <Avatar.Image src={user?.avatarUrl} alt={displayName} />
          </Avatar.Root>
        </Button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg="var(--apple-surface-raised)"
            borderColor="var(--apple-border)"
            borderRadius="md"
            borderWidth="1px"
            boxShadow="var(--surface-shadow)"
            backdropFilter="blur(20px) saturate(180%)"
            minW="280px"
            overflow="hidden"
            p={2}
          >
            <Flex align="center" gap={3} px={2.5} py={2.5}>
              <Box flexShrink={0} position="relative">
                <Avatar.Root bg="var(--apple-text)" color="var(--apple-bg)" size="md">
                  <Avatar.Fallback name={displayName} fontWeight="800" />
                  <Avatar.Image src={user?.avatarUrl} alt={displayName} />
                </Avatar.Root>
                <Box
                  bg="#1d7f43"
                  borderColor="var(--apple-surface)"
                  borderRadius="full"
                  borderWidth="2px"
                  bottom="0"
                  h="11px"
                  position="absolute"
                  right="0"
                  w="11px"
                />
              </Box>
              <Box minW={0}>
                <Text color="var(--apple-text)" fontSize="sm" fontWeight="800" truncate>
                  {displayName}
                </Text>
                <Text color="var(--apple-muted)" fontSize="xs" mt={0.5} truncate>
                  {accountLabel}
                </Text>
              </Box>
            </Flex>

            <Menu.Separator borderColor="var(--apple-border-soft)" my={1.5} />

            <Menu.Item
              borderRadius="md"
              cursor="pointer"
              gap={3}
              minH="44px"
              value="profile"
              onClick={() => navigate("/profile")}
              _highlighted={{ bg: "var(--apple-blue-soft)", color: "var(--apple-blue)" }}
            >
              <Flex align="center" color="var(--apple-blue)" justify="center" w="24px">
                <ProfileIcon />
              </Flex>
              <Text flex="1" fontSize="sm" fontWeight="700">
                {t("sidebar.profile")}
              </Text>
            </Menu.Item>

            <Menu.Item
              borderRadius="md"
              cursor="pointer"
              gap={3}
              minH="44px"
              value="settings"
              onClick={() => navigate("/settings")}
              _highlighted={{ bg: "var(--apple-blue-soft)", color: "var(--apple-blue)" }}
            >
              <Flex align="center" color="var(--apple-muted)" justify="center" w="24px">
                <SettingsIcon />
              </Flex>
              <Text flex="1" fontSize="sm" fontWeight="700">
                {t("sidebar.settings")}
              </Text>
            </Menu.Item>

            <ThemeMenuItems />

            <Menu.Separator borderColor="var(--apple-border-soft)" my={1.5} />

            <Menu.Item
              borderRadius="md"
              color="#b42318"
              cursor={isLoading ? "wait" : "pointer"}
              disabled={isLoading}
              gap={3}
              minH="44px"
              value="logout"
              onClick={handleLogout}
              _highlighted={{ bg: "#fff1f0", color: "#b42318" }}
            >
              <Flex align="center" justify="center" w="24px">
                {isLoading ? <Spinner size="xs" /> : <LogoutIcon />}
              </Flex>
              <Text flex="1" fontSize="sm" fontWeight="700">
                {t("nav.logout")}
              </Text>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
