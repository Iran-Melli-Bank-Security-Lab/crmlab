import { SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { hasAnyExplicitPermissionGrant } from "@/entities/permission/model/permissionGrants";
import { usePermission } from "@/features/access-control/model/usePermission";
import { useLanguage } from "@/features/language/model";
import { dashboardWidgetRegistry } from "@/widgets/dashboard/model/dashboardWidgetRegistry";
import {
  dashboardWidgetComponents,
  EmptyDashboardState,
} from "@/widgets/dashboard/ui/DashboardWidgets";
import PageHeader from "@/shared/ui/layout/PageHeader";

export default function Dashboard() {
  const { t } = useLanguage();
  const { permissions } = usePermission();
  const visibleWidgets = dashboardWidgetRegistry
    .filter((widget) => hasAnyExplicitPermissionGrant(permissions, widget.permissions))
    .sort((left, right) => left.order - right.order);

  return (
    <VStack align="stretch" gap={6}>
      <PageHeader
        eyebrow={t("dashboard.badge")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        meta={
          <Text color="var(--apple-muted)" fontSize="sm" fontWeight="700">
            {t("dashboard.visibleWidgets", { count: visibleWidgets.length })}
          </Text>
        }
      />

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
