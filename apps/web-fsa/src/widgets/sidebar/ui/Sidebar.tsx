import { NavLink, useLocation } from "react-router-dom";
import {
  Box,
  CloseButton,
  Drawer,
  Flex,
  HStack,
  Link as ChakraLink,
  Portal,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";
import { sidebarItems, type SidebarItem } from "@/widgets/sidebar/model/sidebarItems";
import { closeDrawer, openDrawer } from "@/features/ui-state/model/uiSlice";
import { usePermission } from "@/features/access-control/model/usePermission";
import { useLanguage } from "@/features/language/model";
import { getDashboardPathByPermissions } from "@/shared/lib/dashboard";
import { canShowNavigationItem } from "@/entities/permission/application/sidebarAccess";

type IconName = SidebarItem["icon"];

const sectionOrder = [
  "Dashboards",
  "Admin",
  "Security Manager",
  "Pentester",
  "DevOps",
  "Representative",
  "Quality Manager",
  "Quality Assurance",
  "Workspace",
  "Account",
];

const iconPaths: Record<string, string[]> = {
  briefcase: [
    "M10 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1",
    "M4 7h20v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z",
    "M4 12h20",
  ],
  check: ["M20 7 10 17l-5-5", "M4 4h20v20H4V4Z"],
  clipboard: ["M9 5h10", "M9 9h10", "M9 13h6", "M6 3h16v20H6V3Z"],
  folder: ["M3 7h7l2 2h13v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"],
  layout: ["M4 5h20v16H4V5Z", "M4 10h20", "M11 10v11"],
  plus: ["M12 5v14", "M5 12h14", "M3 3h18v18H3V3Z"],
  server: ["M5 5h18v6H5V5Z", "M5 15h18v6H5v-6Z", "M8 8h.01", "M8 18h.01"],
  settings: [
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    "M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4",
  ],
  shield: ["M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3Z"],
  target: [
    "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z",
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    "M12 12h.01",
  ],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 22a8 8 0 0 1 16 0"],
  users: [
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M17 10a3 3 0 1 0 0-6",
    "M3 22a7 7 0 0 1 12 0",
    "M15 18a6 6 0 0 1 6 4",
  ],
};

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="16"
    >
      {(iconPaths[name] || iconPaths.folder).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function groupItems(items: SidebarItem[]) {
  const grouped = items.reduce<Record<string, SidebarItem[]>>((groups, item) => {
    groups[item.section] = groups[item.section] || [];
    groups[item.section].push(item);
    return groups;
  }, {});

  return Object.entries(grouped).sort(([a], [b]) => {
    const aIndex = sectionOrder.indexOf(a);
    const bIndex = sectionOrder.indexOf(b);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
}

function NavigationPanel({
  onNavigate,
  sections,
}: {
  onNavigate?: () => void;
  sections: Array<[string, SidebarItem[]]>;
}) {
  const { t } = useLanguage();
  const location = useLocation();
  const activePath = `${location.pathname}${location.search}`;
  const isItemActive = (itemPath: string) =>
    itemPath.includes("?") ? activePath === itemPath : location.pathname === itemPath;

  return (
    <Flex direction="column" h="full" minH={0} className="enterprise-nav">
      <Box px={5} py={5}>
        <HStack gap={3}>
          <Flex
            boxSize="9"
            borderRadius="md"
            align="center"
            justify="center"
            bg="var(--apple-text)"
            color="var(--apple-bg)"
            fontSize="sm"
            fontWeight="800"
          >
            SP
          </Flex>
          <Box minW={0}>
            <Text fontSize="md" fontWeight="800" lineClamp={1}>
              {t("app.name")}
            </Text>
            <Text color="var(--apple-muted)" fontSize="xs" fontWeight="600">
              {t("nav.console")}
            </Text>
          </Box>
        </HStack>
      </Box>

      <Separator />

      <VStack as="nav" align="stretch" gap={5} px={3} py={4} overflowY="auto">
        {sections.map(([section, items]) => (
          <VStack key={section} align="stretch" gap={1}>
            <Text
              px={3}
              pb={1}
              color="var(--apple-muted)"
              fontSize="xs"
              fontWeight="800"
              letterSpacing="0"
              className="enterprise-nav-section"
            >
              {t(items[0].sectionKey)}
            </Text>

            {items.map((item) => (
  <ChakraLink
    asChild
    key={item.path}
    display="block"
    w="full"
    width="100%"
    borderRadius="md"
    color="var(--apple-secondary)"
    fontSize="sm"
    fontWeight="650"
    textDecoration="none"
    _hover={{ textDecoration: "none" }}
    _focus={{ outline: "none", boxShadow: "none" }}
    _focusVisible={{ outline: "none", boxShadow: "none" }}
    css={{
      "&": {
        width: "100%",
      },

      "& .nav-item": {
        width: "100%",
      },

      "&.active .nav-item": {
        width: "100%",
        background: "var(--apple-blue-soft)",
        borderColor: "rgba(0, 113, 227, 0.18)",
        color: "var(--apple-blue)",
      },

      "&:focus .nav-item, &:focus-visible .nav-item": {
        boxShadow: "none",
        outline: "none",
      },

      "&.active .nav-accent": {
        opacity: 1,
      },

      "&.active .nav-icon": {
        background: "rgba(0, 113, 227, 0.12)",
        color: "var(--apple-blue)",
      },
    }}
  >
    <NavLink
      to={item.path}
      className={() => (isItemActive(item.path) ? "active" : undefined)}
      end
      onClick={onNavigate}
      style={{
        display: "block",
        width: "100%",
        textDecoration: "none",
      }}
    >
      <HStack
        className="nav-item"
        position="relative"
        w="full"
        width="100%"
        gap={3}
        px={3}
        py={2.5}
        minH="42px"
        border="1px solid"
        borderColor="transparent"
        borderRadius="md"
        outline="none"
        transition="background 120ms ease, border-color 120ms ease, color 120ms ease"
        _hover={{
          bg: "var(--apple-blue-soft)",
          borderColor: "transparent",
        }}
        _focus={{ boxShadow: "none", outline: "none" }}
        _focusVisible={{ boxShadow: "none", outline: "none" }}
      >
        <Box
          className="nav-accent"
          position="absolute"
          insetStart="-1px"
          top="8px"
          bottom="8px"
          w="3px"
          borderRadius="full"
          bg="var(--apple-blue)"
          opacity={0}
        />

        <Flex
          className="nav-icon"
          boxSize="8"
          shrink={0}
          borderRadius="md"
          align="center"
          justify="center"
          bg="var(--apple-surface-subtle)"
          color="var(--apple-muted)"
        >
          <NavIcon name={item.icon} />
        </Flex>

        <Text flex="1" minW={0} lineClamp={1}>
          {t(item.titleKey)}
        </Text>
      </HStack>
    </NavLink>
  </ChakraLink>
))}




          </VStack>
        ))}
      </VStack>
    </Flex>
  );
}

export default function Sidebar() {
  const dispatch = useDispatch();
  const { drawerOpen, sidebarOpen } = useSelector((state: RootState) => state.ui);
  const { permissions } = usePermission();
  const { t } = useLanguage();
  const accessSubject = { permissions };
  const primaryDashboardPath = getDashboardPathByPermissions(permissions);
  const primaryDashboardItem: SidebarItem | null =
    primaryDashboardPath === "/profile"
      ? null
      : {
          icon: "layout",
          title: "Dashboard",
          titleKey: "sidebar.dashboard",
          path: primaryDashboardPath,
          permissions: [],
          section: "Dashboards",
          sectionKey: "sidebar.dashboards",
        };
  const featureItems = sidebarItems.filter((item) => {
    if (item.section === "Dashboards") return false;

    return canShowNavigationItem(accessSubject, {
      permissions: item.permissions,
    });
  });
  const sections = groupItems([
    ...(primaryDashboardItem ? [primaryDashboardItem] : []),
    ...featureItems,
  ]);

  return (
    <>
      {sidebarOpen && (
        <Box
          as="aside"
          display={{ base: "none", md: "block" }}
          w="292px"
          bg="var(--apple-surface-glass)"
          borderRight="1px solid"
          borderColor="var(--apple-border-soft)"
          minH="100vh"
          position="sticky"
          top={0}
          flexShrink={0}
          backdropFilter="blur(20px) saturate(180%)"
        >
          <NavigationPanel sections={sections} />
        </Box>
      )}

      <Drawer.Root
        open={drawerOpen}
        onOpenChange={(event) => {
          if (event.open) dispatch(openDrawer());
          else dispatch(closeDrawer());
        }}
        placement="start"
        size="xs"
      >
        <Portal>
          <Drawer.Backdrop bg="blackAlpha.500" backdropFilter="blur(4px)" />
          <Drawer.Positioner>
            <Drawer.Content maxW="320px" bg="var(--apple-surface-raised)">
              <Drawer.Header borderBottom="1px solid" borderColor="var(--apple-border-soft)" py={4}>
                <Drawer.Title fontSize="md">{t("app.name")}</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body p={0}>
                <NavigationPanel
                  sections={sections}
                  onNavigate={() => dispatch(closeDrawer())}
                />
              </Drawer.Body>
              <Drawer.CloseTrigger asChild>
                <CloseButton position="absolute" top="3" insetEnd="3" />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>


    </>
  );
}
