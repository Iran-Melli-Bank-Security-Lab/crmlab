import { useDispatch } from "react-redux";
import { Box, Flex, HStack, Text, Wrap, WrapItem } from "@chakra-ui/react";
import { openDrawer, toggleSidebar } from "@/features/ui-state/model/uiSlice";
import { useAuth } from "@/features/auth/model/useAuth";
import { useLanguage } from "@/features/language/model";
import { ThemeIconButton } from "@/features/theme/ui/ThemeToggle";
import NotificationCenter from "@/widgets/notification-center/ui/NotificationCenter";
import ProfileMenu from "@/widgets/profile-menu/ui/ProfileMenu";
import Badge from "@/shared/ui/primitives/Badge";
import Button from "@/shared/ui/primitives/Button";
import LanguageSwitcher from "@/features/language/ui/LanguageSwitcher";

export default function Navbar() {
  const dispatch = useDispatch();
  const { user, roles } = useAuth();

  const { t } = useLanguage();

  return (
    <Flex
      as="header"
      minH="72px"
      bg="var(--apple-surface-glass)"
      borderBottom="1px solid"
      borderColor="var(--apple-border-soft)"
      align="center"
      justify="space-between"
      px={{ base: 4, md: 6 }}
      position="sticky"
      top={0}
      zIndex={5}
      boxShadow="var(--surface-shadow)"
      backdropFilter="blur(20px) saturate(180%)"
    >
      <HStack gap={4} minW={0}>
        <Button
          variant="ghost"
          display={{ base: "inline-flex", md: "none" }}
          aria-label={t("nav.toggleSidebar")}
          onClick={() => dispatch(openDrawer())}
        >
          ☰
        </Button>
        <Button
          variant="ghost"
          display={{ base: "none", md: "inline-flex" }}
          aria-label={t("nav.toggleSidebar")}
          onClick={() => dispatch(toggleSidebar())}
        >
          ☰
        </Button>
        <Box minW={0}>
          <Text fontWeight="850" color="var(--apple-text)" lineClamp={1} letterSpacing="0">
            {user?.name || "User"}
          </Text>
          <Wrap gap={2} mt={1}>
            {roles.map((role) => (
              <WrapItem key={role}>
                <Badge>{role}</Badge>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      </HStack>
      <HStack gap={3}>
        <LanguageSwitcher />
        <ThemeIconButton />
        <NotificationCenter />
        <ProfileMenu />
      </HStack>
    </Flex>
  );
}
