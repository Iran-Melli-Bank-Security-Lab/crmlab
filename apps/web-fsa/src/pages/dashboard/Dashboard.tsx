import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { hasAnyExplicitPermissionGrant } from "@/entities/permission/model/permissionGrants";
import { usePermission } from "@/features/access-control/model/usePermission";
import { useLanguage } from "@/features/language/model";
import { dashboardWidgetRegistry } from "@/widgets/dashboard/model/dashboardWidgetRegistry";
import {
  dashboardWidgetComponents,
  EmptyDashboardState,
} from "@/widgets/dashboard/ui/DashboardWidgets";

export default function Dashboard() {
  const { t } = useLanguage();
  const { permissions } = usePermission();
  const visibleWidgets = dashboardWidgetRegistry
    .filter((widget) => hasAnyExplicitPermissionGrant(permissions, widget.permissions))
    .sort((left, right) => left.order - right.order);

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" align="end" flexWrap="wrap" gap={4}>
        <Box>
          <Badge
            bg="var(--apple-blue-soft)"
            color="var(--apple-blue)"
            border="1px solid"
            borderColor="var(--apple-blue-border)"
            borderRadius="full"
            px={3}
            py={1}
            mb={3}
            textTransform="none"
            fontWeight="850"
          >
            {t("dashboard.badge")}
          </Badge>
          <Heading
            color="var(--apple-text)"
            fontSize={{ base: "2xl", md: "3xl" }}
            fontWeight="850"
            letterSpacing="0"
            lineHeight="1.12"
          >
            {t("dashboard.title")}
          </Heading>
          <Text color="var(--apple-muted)" mt={2} fontSize="md">
          {t("dashboard.description")}
        </Text>
        </Box>
        <Text color="var(--apple-muted)" fontSize="sm" fontWeight="700">
          {t("dashboard.visibleWidgets", { count: visibleWidgets.length })}
        </Text>
      </HStack>

      {visibleWidgets.length === 0 ? (
        <EmptyDashboardState />
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={5} alignItems="stretch">
          {visibleWidgets.map((widget) => {
            const Widget = dashboardWidgetComponents[widget.id];
            return <Widget key={widget.id} />;
          })}
        </SimpleGrid>
      )}
    </VStack>
  );
}
