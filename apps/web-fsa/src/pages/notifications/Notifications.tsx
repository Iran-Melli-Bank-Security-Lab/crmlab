import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, Button, Flex, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import type { AppNotification, NotificationReadFilter } from "@/entities/notification/model/notification";
import { useNotifications } from "@/features/notifications/model/useNotifications";
import { useLanguage } from "@/features/language/model";
import PageHeader from "@/shared/ui/layout/PageHeader";

const filters: NotificationReadFilter[] = ["all", "unread", "read"];

function formatDate(value: string, language: "en" | "fa") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function NotificationRow({
  notification,
  language,
  onMarkRead,
}: {
  notification: AppNotification;
  language: "en" | "fa";
  onMarkRead: (id: string) => Promise<unknown>;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const openResource = () => {
    if (!notification.isRead) void onMarkRead(notification.id).catch(() => undefined);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  return (
    <Flex
      align={{ base: "stretch", md: "center" }}
      bg={notification.isRead ? "var(--apple-surface)" : "var(--apple-blue-soft)"}
      border="1px solid"
      borderColor={notification.isRead ? "var(--apple-border-soft)" : "var(--apple-blue-border)"}
      borderRadius="md"
      direction={{ base: "column", md: "row" }}
      gap={4}
      p={{ base: 4, md: 5 }}
    >
      <Box flex="1" minW={0}>
        <HStack gap={2} mb={2} flexWrap="wrap">
          {!notification.isRead && <Box aria-label="Unread" bg="var(--apple-blue)" borderRadius="full" h="8px" w="8px" />}
          <Text color="var(--apple-text)" fontWeight="800">{notification.title}</Text>
          <Badge colorPalette={notification.priority === "critical" ? "red" : notification.priority === "high" ? "orange" : "blue"} textTransform="capitalize">
            {notification.priority}
          </Badge>
        </HStack>
        <Text color="var(--apple-secondary)" lineHeight="1.65">{notification.message}</Text>
        <Text color="var(--apple-muted)" fontSize="xs" fontWeight="650" mt={2}>{formatDate(notification.createdAt, language)}</Text>
      </Box>
      <HStack flexShrink={0}>
        {!notification.isRead && (
          <Button size="sm" variant="outline" onClick={() => void onMarkRead(notification.id).catch(() => undefined)}>
            {t("common.read")}
          </Button>
        )}
        {notification.actionUrl && (
          <Button colorPalette="blue" size="sm" onClick={openResource}>
            {t("notifications.openResource")}
          </Button>
        )}
      </HStack>
    </Flex>
  );
}

export default function Notifications() {
  const { language, t } = useLanguage();
  const [filter, setFilter] = useState<NotificationReadFilter>("all");
  const {
    unreadCount,
    page,
    isLoadingPage,
    isMarkingAllRead,
    markRead,
    markAllRead,
    loadNotificationsPage,
  } = useNotifications();

  useEffect(() => {
    void loadNotificationsPage(filter, true).catch(() => undefined);
    // The loader changes as cursor state advances; filter is the reset trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filterLabels = {
    all: t("notifications.filterAll"),
    unread: t("notifications.filterUnread"),
    read: t("notifications.filterRead"),
  };

  return (
    <VStack align="stretch" gap={6}>
      <PageHeader
        eyebrow={unreadCount > 0 ? `${unreadCount} ${t("notifications.filterUnread")}` : t("notifications.title")}
        title={t("notifications.title")}
        description={t("notifications.pageDescription")}
        actions={unreadCount > 0 ? (
          <Button colorPalette="blue" disabled={isMarkingAllRead} onClick={() => void markAllRead().catch(() => undefined)}>
            {isMarkingAllRead && <Spinner size="xs" />}
            {t("notifications.markAllRead")}
          </Button>
        ) : undefined}
      />

      <HStack gap={2} flexWrap="wrap">
        {filters.map((value) => (
          <Button key={value} size="sm" variant={filter === value ? "solid" : "outline"} colorPalette={filter === value ? "blue" : "gray"} onClick={() => setFilter(value)}>
            {filterLabels[value]}
          </Button>
        ))}
      </HStack>

      {isLoadingPage && page.ids.length === 0 ? (
        <Flex minH="240px" align="center" justify="center"><Spinner color="var(--apple-blue)" /></Flex>
      ) : page.items.length === 0 ? (
        <Box bg="var(--apple-surface)" border="1px solid" borderColor="var(--apple-border-soft)" borderRadius="md" p={10} textAlign="center">
          <Text color="var(--apple-muted)">{t("notifications.noFiltered")}</Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={3}>
          {page.items.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} language={language} onMarkRead={markRead} />
          ))}
        </VStack>
      )}

      {page.hasMore && (
        <Flex justify="center">
          <Button variant="outline" disabled={isLoadingPage} onClick={() => void loadNotificationsPage(filter).catch(() => undefined)}>
            {isLoadingPage && <Spinner size="xs" />}
            {t("notifications.loadOlder")}
          </Button>
        </Flex>
      )}
    </VStack>
  );
}
