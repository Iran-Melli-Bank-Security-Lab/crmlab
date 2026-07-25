import {
  Badge,
  Box,
  CloseButton,
  Dialog,
  HStack,
  NativeSelect,
  Portal,
  SimpleGrid,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo, useState, type FormEvent } from "react";
import {
  useGetAuditLogQuery,
  useGetAuditLogsQuery,
  type AuditLog,
  type AuditLogQuery,
  type AuditLogSortField,
} from "@/entities/audit/api/auditApi";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";
import Card from "@/shared/ui/primitives/Card";
import Input from "@/shared/ui/primitives/Input";
import PageHeader from "@/shared/ui/layout/PageHeader";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";

type AuditFilterDraft = Pick<
  AuditLogQuery,
  "search" | "user" | "action" | "module" | "project" | "ip" | "status" | "from" | "to"
>;

const INITIAL_QUERY: AuditLogQuery = {
  page: 1,
  pageSize: 25,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const EMPTY_FILTERS: AuditFilterDraft = {};

function AuditStatusBadge({ status }: { status: AuditLog["status"] }) {
  const { t } = useLanguage();
  return (
    <Badge
      colorPalette={status === "success" ? "green" : "red"}
      variant="subtle"
      borderRadius="full"
      textTransform="none"
    >
      {t(status === "success" ? "audit.status.success" : "audit.status.failure")}
    </Badge>
  );
}

function ResourceLabel({ log }: { log: AuditLog }) {
  return (
    <Box minW={0}>
      <Text fontWeight="800" lineClamp={1}>{log.resource.type}</Text>
      <Text color="var(--apple-muted)" fontSize="xs" lineClamp={1}>
        {log.resource.id || "—"}
      </Text>
      {log.project && (
        <Text color="var(--apple-blue)" fontSize="xs" lineClamp={1}>
          {log.project.name || log.project.id}
        </Text>
      )}
    </Box>
  );
}

function JsonValue({ value }: { value: unknown }) {
  const text = value === undefined
    ? "—"
    : typeof value === "string"
      ? value
      : JSON.stringify(value, null, 2);
  return (
    <Text
      as="pre"
      m={0}
      p={3}
      maxH="280px"
      overflow="auto"
      borderRadius="md"
      bg="var(--apple-surface-subtle)"
      color="var(--apple-text)"
      fontFamily="mono"
      fontSize="xs"
      whiteSpace="pre-wrap"
      overflowWrap="anywhere"
    >
      {text}
    </Text>
  );
}

function AuditLogDetails({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { language, t } = useLanguage();
  const { data: log, isLoading, error, refetch } = useGetAuditLogQuery(id);
  const locale = language === "fa" ? "fa-IR" : "en-US";

  return (
    <Dialog.Root
      open
      size="xl"
      placement="center"
      scrollBehavior="inside"
      onOpenChange={(event) => {
        if (!event.open) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(3px)" />
        <Dialog.Positioner p={{ base: 2, md: 6 }}>
          <Dialog.Content
            maxW="1050px"
            maxH="calc(100dvh - 32px)"
            bg="var(--apple-surface-raised)"
            border="1px solid"
            borderColor="var(--apple-border)"
            borderRadius="xl"
          >
            <Dialog.Header borderBottom="1px solid" borderColor="var(--apple-border-soft)">
              <Box pe={10}>
                <Dialog.Title>{t("audit.details.title")}</Dialog.Title>
                <Dialog.Description color="var(--apple-muted)">
                  {t("audit.details.description")}
                </Dialog.Description>
              </Box>
            </Dialog.Header>
            <Dialog.Body>
              {isLoading && <LoadingScreen text={t("audit.details.loading")} />}
              {error && (
                <VStack align="stretch">
                  <ErrorState error={error} />
                  <Button alignSelf="start" variant="secondary" onClick={() => refetch()}>
                    {t("audit.retry")}
                  </Button>
                </VStack>
              )}
              {log && (
                <VStack align="stretch" gap={4}>
                  <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
                    {[
                      [t("audit.columns.actor"), log.actor?.name || t("audit.systemActor")],
                      [t("audit.columns.username"), log.actor?.username || "—"],
                      [t("audit.columns.action"), log.action],
                      [t("audit.columns.module"), log.module],
                      [t("audit.columns.resource"), `${log.resource.type} · ${log.resource.id || "—"}`],
                      [t("audit.columns.project"), log.project?.name || log.project?.id || "—"],
                      [t("audit.columns.timestamp"), new Date(log.createdAt).toLocaleString(locale)],
                      [t("audit.columns.ip"), log.ip || "—"],
                      [t("audit.columns.status"), t(log.status === "success" ? "audit.status.success" : "audit.status.failure")],
                    ].map(([label, value]) => (
                      <Box
                        key={label}
                        p={3}
                        border="1px solid"
                        borderColor="var(--apple-border-soft)"
                        borderRadius="md"
                        bg="var(--apple-surface-subtle)"
                      >
                        <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800">{label}</Text>
                        <Text mt={1} fontWeight="700" overflowWrap="anywhere">{value}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                  <Box>
                    <Text fontWeight="900" mb={2}>{t("audit.columns.userAgent")}</Text>
                    <JsonValue value={log.userAgent} />
                  </Box>
                  <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                    <Box>
                      <Text fontWeight="900" mb={2}>{t("audit.columns.previousValue")}</Text>
                      <JsonValue value={log.previousValue} />
                    </Box>
                    <Box>
                      <Text fontWeight="900" mb={2}>{t("audit.columns.newValue")}</Text>
                      <JsonValue value={log.newValue} />
                    </Box>
                  </SimpleGrid>
                  <Box>
                    <Text fontWeight="900" mb={2}>{t("audit.columns.metadata")}</Text>
                    <JsonValue value={log.metadata} />
                  </Box>
                </VStack>
              )}
            </Dialog.Body>
            <Dialog.Footer borderTop="1px solid" borderColor="var(--apple-border-soft)">
              <Button variant="secondary" onClick={onClose}>{t("audit.close")}</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton position="absolute" top="3" insetEnd="3" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default function AuditLogs() {
  const { language, t } = useLanguage();
  const locale = language === "fa" ? "fa-IR" : "en-US";
  const [query, setQuery] = useState<AuditLogQuery>(INITIAL_QUERY);
  const [draft, setDraft] = useState<AuditFilterDraft>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string>();
  const { data, isLoading, isFetching, error, refetch } = useGetAuditLogsQuery(query);
  const logs = data?.items || [];
  const pageInfo = data?.pageInfo;
  const hasFilters = useMemo(
    () =>
      [
        query.search,
        query.user,
        query.action,
        query.module,
        query.project,
        query.ip,
        query.status,
        query.from,
        query.to,
      ].some(Boolean),
    [query]
  );

  const setFilter = (key: keyof AuditFilterDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setQuery((current) => ({ ...current, ...draft, page: 1 }));
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setQuery(INITIAL_QUERY);
  };

  const sortBy = (field: AuditLogSortField) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      sortBy: field,
      sortOrder:
        current.sortBy === field && current.sortOrder === "desc" ? "asc" : "desc",
    }));
  };

  const sortIndicator = (field: AuditLogSortField) =>
    query.sortBy === field ? (query.sortOrder === "asc" ? " ↑" : " ↓") : "";

  return (
    <VStack align="stretch" gap={5} maxW="1700px" mx="auto">
      <PageHeader
        title={t("audit.title")}
        description={t("audit.description")}
      />

      <Card>
        <Box as="form" onSubmit={applyFilters}>
          <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={3}>
            <Input
              label={t("audit.filters.search")}
              value={draft.search || ""}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder={t("audit.filters.searchPlaceholder")}
            />
            <Input label={t("audit.filters.user")} value={draft.user || ""} onChange={(event) => setFilter("user", event.target.value)} />
            <Input label={t("audit.filters.action")} value={draft.action || ""} onChange={(event) => setFilter("action", event.target.value)} />
            <Input label={t("audit.filters.module")} value={draft.module || ""} onChange={(event) => setFilter("module", event.target.value)} />
            <Input label={t("audit.filters.project")} value={draft.project || ""} onChange={(event) => setFilter("project", event.target.value)} />
            <Input label={t("audit.filters.ip")} value={draft.ip || ""} onChange={(event) => setFilter("ip", event.target.value)} />
            <Input type="date" label={t("audit.filters.from")} value={draft.from || ""} onChange={(event) => setFilter("from", event.target.value)} />
            <Input type="date" label={t("audit.filters.to")} value={draft.to || ""} onChange={(event) => setFilter("to", event.target.value)} />
            <Box>
              <Text fontSize="sm" fontWeight="700" mb={1.5}>{t("audit.filters.status")}</Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={draft.status || ""}
                  onChange={(event) => setFilter("status", event.target.value)}
                  bg="var(--apple-surface)"
                  borderColor="var(--apple-border)"
                >
                  <option value="">{t("audit.filters.allStatuses")}</option>
                  <option value="success">{t("audit.status.success")}</option>
                  <option value="failure">{t("audit.status.failure")}</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
          </SimpleGrid>
          <HStack mt={4} gap={2} flexWrap="wrap">
            <Button type="submit" isLoading={isFetching}>{t("audit.filters.apply")}</Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>
              {t("audit.filters.clear")}
            </Button>
          </HStack>
        </Box>
      </Card>

      {data?.policy.mode === "read-only" && (
        <Box
          p={3}
          border="1px solid"
          borderColor="var(--apple-blue-border)"
          borderRadius="md"
          bg="var(--apple-blue-soft)"
        >
          <Text color="var(--apple-secondary)" fontSize="sm">
            {t("audit.policy.readOnly")}
          </Text>
        </Box>
      )}

      {isLoading && <LoadingScreen text={t("audit.loading")} />}
      {error && (
        <VStack align="stretch">
          <ErrorState error={error} title={t("audit.loadError")} />
          <Button alignSelf="start" variant="secondary" onClick={() => refetch()}>
            {t("audit.retry")}
          </Button>
        </VStack>
      )}
      {!isLoading && !error && logs.length === 0 && (
        <Card>
          <EmptyState
            title={t("audit.emptyTitle")}
            description={hasFilters ? t("audit.emptyFiltered") : t("audit.emptyDescription")}
          />
        </Card>
      )}

      {!isLoading && !error && logs.length > 0 && (
        <Box
          overflow="hidden"
          bg="var(--apple-surface-raised)"
          border="1px solid"
          borderColor="var(--apple-border-soft)"
          borderRadius="md"
          boxShadow="0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <HStack
            px={4}
            py={3}
            justify="space-between"
            borderBottom="1px solid"
            borderColor="var(--apple-border-soft)"
            flexWrap="wrap"
          >
            <Text fontWeight="900">{t("audit.results", { count: pageInfo?.total || 0 })}</Text>
            <HStack>
              <Text fontSize="sm" color="var(--apple-muted)">{t("audit.pageSize")}</Text>
              <NativeSelect.Root width="90px" size="sm">
                <NativeSelect.Field
                  value={query.pageSize}
                  onChange={(event) =>
                    setQuery((current) => ({
                      ...current,
                      page: 1,
                      pageSize: Number(event.target.value),
                    }))
                  }
                >
                  {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>
          </HStack>

          <Box display={{ base: "none", lg: "block" }}>
            <Table.ScrollArea maxH="68vh">
              <Table.Root size="sm" variant="line" interactive stickyHeader>
                <Table.Header>
                  <Table.Row bg="var(--apple-surface-subtle)">
                    <Table.ColumnHeader cursor="pointer" onClick={() => sortBy("createdAt")}>{t("audit.columns.timestamp")}{sortIndicator("createdAt")}</Table.ColumnHeader>
                    <Table.ColumnHeader>{t("audit.columns.actor")}</Table.ColumnHeader>
                    <Table.ColumnHeader cursor="pointer" onClick={() => sortBy("action")}>{t("audit.columns.action")}{sortIndicator("action")}</Table.ColumnHeader>
                    <Table.ColumnHeader cursor="pointer" onClick={() => sortBy("module")}>{t("audit.columns.module")}{sortIndicator("module")}</Table.ColumnHeader>
                    <Table.ColumnHeader cursor="pointer" onClick={() => sortBy("entityType")}>{t("audit.columns.resource")}{sortIndicator("entityType")}</Table.ColumnHeader>
                    <Table.ColumnHeader cursor="pointer" onClick={() => sortBy("ip")}>{t("audit.columns.ip")}{sortIndicator("ip")}</Table.ColumnHeader>
                    <Table.ColumnHeader cursor="pointer" onClick={() => sortBy("status")}>{t("audit.columns.status")}{sortIndicator("status")}</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">{t("audit.columns.details")}</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {logs.map((log) => (
                    <Table.Row key={log.id} _even={{ bg: "var(--apple-surface-subtle)" }}>
                      <Table.Cell whiteSpace="nowrap">{new Date(log.createdAt).toLocaleString(locale)}</Table.Cell>
                      <Table.Cell>
                        <Text fontWeight="800">{log.actor?.name || t("audit.systemActor")}</Text>
                        <Text color="var(--apple-muted)" fontSize="xs">{log.actor?.username || "—"}</Text>
                      </Table.Cell>
                      <Table.Cell fontWeight="800">{log.action}</Table.Cell>
                      <Table.Cell><Badge variant="outline">{log.module}</Badge></Table.Cell>
                      <Table.Cell><ResourceLabel log={log} /></Table.Cell>
                      <Table.Cell dir="ltr">{log.ip || "—"}</Table.Cell>
                      <Table.Cell><AuditStatusBadge status={log.status} /></Table.Cell>
                      <Table.Cell textAlign="end">
                        <Button variant="ghost" onClick={() => setSelectedId(log.id)}>
                          {t("audit.view")}
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Box>

          <VStack display={{ base: "flex", lg: "none" }} align="stretch" gap={0}>
            {logs.map((log) => (
              <Box
                key={log.id}
                p={4}
                borderBottom="1px solid"
                borderColor="var(--apple-border-soft)"
              >
                <HStack justify="space-between" align="start">
                  <Box minW={0}>
                    <Text fontWeight="900" overflowWrap="anywhere">{log.action}</Text>
                    <Text color="var(--apple-muted)" fontSize="xs">
                      {new Date(log.createdAt).toLocaleString(locale)}
                    </Text>
                  </Box>
                  <AuditStatusBadge status={log.status} />
                </HStack>
                <SimpleGrid columns={2} gap={2} mt={3}>
                  <Box><Text fontSize="xs" color="var(--apple-muted)">{t("audit.columns.actor")}</Text><Text fontSize="sm">{log.actor?.name || t("audit.systemActor")}</Text></Box>
                  <Box><Text fontSize="xs" color="var(--apple-muted)">{t("audit.columns.module")}</Text><Text fontSize="sm">{log.module}</Text></Box>
                  <Box><Text fontSize="xs" color="var(--apple-muted)">{t("audit.columns.ip")}</Text><Text fontSize="sm" dir="ltr">{log.ip || "—"}</Text></Box>
                  <ResourceLabel log={log} />
                </SimpleGrid>
                <Button mt={3} variant="secondary" width="full" onClick={() => setSelectedId(log.id)}>
                  {t("audit.view")}
                </Button>
              </Box>
            ))}
          </VStack>

          <HStack
            px={4}
            py={3}
            justify="space-between"
            borderTop="1px solid"
            borderColor="var(--apple-border-soft)"
            bg="var(--apple-surface-subtle)"
            flexWrap="wrap"
          >
            <Text color="var(--apple-muted)" fontSize="sm">
              {t("audit.pageOf", {
                page: pageInfo?.page || 1,
                total: pageInfo?.totalPages || 1,
              })}
            </Text>
            <HStack>
              <Button
                variant="secondary"
                disabled={(pageInfo?.page || 1) <= 1}
                onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              >
                {t("audit.previous")}
              </Button>
              <Button
                variant="secondary"
                disabled={(pageInfo?.page || 1) >= (pageInfo?.totalPages || 1)}
                onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              >
                {t("audit.next")}
              </Button>
            </HStack>
          </HStack>
        </Box>
      )}

      {selectedId && <AuditLogDetails id={selectedId} onClose={() => setSelectedId(undefined)} />}
    </VStack>
  );
}
