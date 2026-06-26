import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { hasAnyExplicitPermissionGrant } from "@/entities/permission/model/permissionGrants";
import { usePermission } from "@/features/access-control/model/usePermission";
import { dashboardWidgetRegistry } from "@/widgets/dashboard/model/dashboardWidgetRegistry";
import {
  dashboardWidgetComponents,
  EmptyDashboardState,
} from "@/widgets/dashboard/ui/DashboardWidgets";

export default function Dashboard() {
  const { permissions } = usePermission();
  const visibleWidgets = dashboardWidgetRegistry
    .filter((widget) => hasAnyExplicitPermissionGrant(permissions, widget.permissions))
    .sort((left, right) => left.order - right.order);

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" align="end" flexWrap="wrap" gap={4}>
        <Box>
          <Badge
            bg="rgba(0, 113, 227, 0.08)"
            color="#0071e3"
            border="1px solid"
            borderColor="rgba(0, 113, 227, 0.16)"
            borderRadius="full"
            px={3}
            py={1}
            mb={3}
            textTransform="none"
            fontWeight="850"
          >
            Permission-composed workspace
          </Badge>
          <Heading
            color="#1d1d1f"
            fontSize={{ base: "2xl", md: "3xl" }}
            fontWeight="850"
            letterSpacing="0"
            lineHeight="1.12"
          >
            Dashboard
          </Heading>
          <Text color="#6e6e73" mt={2} fontSize="md">
          A single workspace composed from your effective permissions.
        </Text>
        </Box>
        <Text color="#6e6e73" fontSize="sm" fontWeight="700">
          {visibleWidgets.length} visible widgets
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
