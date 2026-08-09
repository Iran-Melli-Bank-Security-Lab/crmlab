import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Badge,
  Box,
  Center,
  chakra,
  Grid,
  HStack,
  IconButton,
  Link,
  NativeSelect,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";
import { useSyncProjectTableSettings } from "@/features/ui-state/api/projectTableSettingsApi";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import { useLanguage } from "@/features/language/model";
import type { TranslationKey } from "@/features/language/model";
import type { ProjectPriority, ProjectStatus } from "@/shared/types";
import { formatDate, getDefaultSortValue, normalize } from "./formatters";
import { PlusIcon } from "./icons";
import type {
  ProjectTableBaseProps,
  ProjectTableColumn,
  ProjectTableRow,
  SortDirection,
} from "./types";

const statusLabelKeys: Record<ProjectStatus, TranslationKey> = {
  new: "projectTable.status.new",
  in_progress: "projectTable.status.inProgress",
  pending: "projectTable.status.pended",
  planning: "projectTable.status.planning",
  active: "projectTable.status.active",
  blocked: "projectTable.status.blocked",
  review: "projectTable.status.review",
  completed: "projectTable.status.completed",
};

const priorityLabelKeys: Record<ProjectPriority, TranslationKey> = {
  low: "projectTable.priority.low",
  medium: "projectTable.priority.medium",
  high: "projectTable.priority.high",
  critical: "projectTable.priority.critical",
};

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20];
const PROJECT_TABLE_PAGINATION_KEY_PREFIX = "crmlab:project-table-pagination:v1";

function getDisplayText(value: unknown, column: ProjectTableColumn) {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => getDisplayText(item, column))
      .filter(Boolean)
      .join(", ");
  }
  if (column.kind === "date" && typeof value === "string") return formatDate(value);
  if (column.kind === "percent" && typeof value === "number") return `${value}%`;
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const user = value as Record<string, unknown>;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return String(user.name || name || user.username || user.email || "");
  }
  return String(value);
}

function DefaultProjectCell({
  project,
  column,
}: {
  project: ProjectTableRow;
  column: ProjectTableColumn;
}) {
  const rawValue = column.key === "summary" ? project.name : project[column.key];
  const text = getDisplayText(rawValue, column);

  if (!text) {
    return <Text color="var(--apple-muted)">—</Text>;
  }

  const isUrl = /^https?:\/\//i.test(text);
  if (column.kind === "link" && isUrl) {
    return (
      <Link
        href={text}
        target="_blank"
        rel="noreferrer"
        color="var(--apple-blue)"
        maxW="full"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
        title={text}
        onClick={(event) => event.stopPropagation()}
      >
        {text}
      </Link>
    );
  }

  if (column.kind === "user") {
    const initials = text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

    return (
      <HStack gap={2.5} minW={0}>
        <Center
          aria-hidden="true"
          boxSize="7"
          flexShrink={0}
          borderRadius="full"
          bg="var(--apple-surface-hover)"
          color="var(--apple-secondary)"
          fontSize="10px"
          fontWeight="850"
        >
          {initials}
        </Center>
        <Text truncate title={text} fontWeight="700">
          {text}
        </Text>
      </HStack>
    );
  }

  if (column.kind === "number" || column.kind === "percent") {
    return (
      <Text
        color="var(--apple-secondary)"
        fontWeight="750"
        fontVariantNumeric="tabular-nums"
      >
        {text}
      </Text>
    );
  }

  if (column.kind === "date") {
    return (
      <Text color="var(--apple-secondary)" fontSize="sm" whiteSpace="nowrap">
        {text}
      </Text>
    );
  }

  return (
    <Text
      maxW="full"
      overflow="hidden"
      textOverflow={column.wrap ? undefined : "ellipsis"}
      whiteSpace={column.wrap ? "normal" : "nowrap"}
      overflowWrap={column.wrap ? "anywhere" : undefined}
      lineClamp={column.wrap ? 2 : undefined}
      title={text}
    >
      {text}
    </Text>
  );
}

type StoredPagination = {
  page: number;
  pageSize: number;
};

function getStoredPagination(storageKey: string): StoredPagination {
  if (typeof window === "undefined") {
    return { page: 1, pageSize: DEFAULT_PAGE_SIZE };
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) {
      return { page: 1, pageSize: DEFAULT_PAGE_SIZE };
    }

    const parsedValue = JSON.parse(storedValue) as Partial<StoredPagination>;
    const storedPageSize = Number(parsedValue.pageSize);
    const storedPage = Number(parsedValue.page);

    return {
      page: Number.isInteger(storedPage) && storedPage > 0 ? storedPage : 1,
      pageSize: PAGE_SIZE_OPTIONS.includes(storedPageSize)
        ? storedPageSize
        : DEFAULT_PAGE_SIZE,
    };
  } catch {
    return { page: 1, pageSize: DEFAULT_PAGE_SIZE };
  }
}

export default function ProjectTableBase({
  projects,
  columns,
  paginationId = "default",
  title = "Projects",
  emptyTitle = "No projects found",
  actionLabel = "Open",
  onAction,
  onOpenPentestWorkspace,
  onRowClick,
  onRowDoubleClick,
  onCreateFromProject,
  onAssignPentesters,
}: ProjectTableBaseProps) {
  const { dir, t } = useLanguage();
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  useSyncProjectTableSettings(currentUserId);
  const configuredColumnKeys = useSelector((state: RootState) =>
    state.ui.projectTableSettingsUserId === state.auth.user?.id
      ? state.ui.visibleProjectColumns[paginationId]
      : undefined
  );
  const configuredColumnOrder = useSelector((state: RootState) =>
    state.ui.projectTableSettingsUserId === state.auth.user?.id
      ? state.ui.projectTableColumnOrder[paginationId]
      : undefined
  );
  const columnAliases = useSelector((state: RootState) =>
    state.ui.projectTableSettingsUserId === state.auth.user?.id
      ? state.ui.projectTableColumnAliases[paginationId]
      : undefined
  );
  const visibleColumns = useMemo(() => {
    const enabledColumns = configuredColumnKeys
      ? columns.filter((column) => configuredColumnKeys.includes(String(column.key)))
      : columns;

    if (!configuredColumnOrder) return enabledColumns;

    const positions = new Map(configuredColumnOrder.map((key, index) => [key, index]));
    return [...enabledColumns].sort(
      (left, right) =>
        (positions.get(String(left.key)) ?? columns.length) -
        (positions.get(String(right.key)) ?? columns.length)
    );
  }, [columns, configuredColumnKeys, configuredColumnOrder]);
  const paginationStorageKey = `${PROJECT_TABLE_PAGINATION_KEY_PREFIX}:${paginationId}`;
  const initialPagination = useMemo(
    () => getStoredPagination(paginationStorageKey),
    [paginationStorageKey]
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [priority, setPriority] = useState<ProjectPriority | "all">("all");
  const [pageSize, setPageSize] = useState(initialPagination.pageSize);
  const [page, setPage] = useState(initialPagination.page);
  const [sort, setSort] = useState<{
    key: ProjectTableColumn["key"];
    direction: SortDirection;
  }>({
    key: "createdAt",
    direction: "desc",
  });

  const filteredProjects = useMemo(() => {
    const search = query.trim().toLowerCase();

    return projects
      .filter((project) => status === "all" || project.status === status)
      .filter((project) => priority === "all" || project.priority === priority)
      .filter((project) => {
        if (!search) return true;
        return [
          project.name,
          project.client,
          project.owner,
          project.assignee,
          project.repository,
          project.environment,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => {
        const column = columns.find((item) => item.key === sort.key);
        const leftValue = normalize(
          column?.sortValue?.(left) ?? getDefaultSortValue(left, sort.key)
        );
        const rightValue = normalize(
          column?.sortValue?.(right) ?? getDefaultSortValue(right, sort.key)
        );
        if (leftValue < rightValue) return sort.direction === "asc" ? -1 : 1;
        if (leftValue > rightValue) return sort.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [columns, priority, projects, query, sort, status]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProjects = useMemo(
    () => filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredProjects, pageSize]
  );
  const { activeProjects, blockedProjects } = useMemo(
    () => ({
      activeProjects: projects.filter((project) => project.status === "active").length,
      blockedProjects: projects.filter((project) => project.status === "blocked").length,
    }),
    [projects]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      paginationStorageKey,
      JSON.stringify({ page: currentPage, pageSize })
    );
  }, [currentPage, pageSize, paginationStorageKey]);

  const handleSort = (column: ProjectTableColumn) => {
    if (!column.sortable) return;
    setSort((current) => ({
      key: column.key,
      direction:
        current.key === column.key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = <T extends string>(
    setter: Dispatch<SetStateAction<T>>,
    value: T
  ) => {
    setter(value);
    setPage(1);
  };

  return (
    <Box
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="xl"
      boxShadow="0 8px 28px rgba(15, 23, 42, 0.06)"
      overflow="hidden"
      dir={dir}
      position="relative"
      _before={{
        content: '""',
        position: "absolute",
        insetInline: 0,
        top: 0,
        h: "2px",
        bg: "var(--apple-blue)",
        zIndex: 2,
      }}
    >
      <VStack
        align="stretch"
        gap={4}
        p={{ base: 4, md: 5 }}
        borderBottom="1px solid"
        borderColor="var(--apple-border-soft)"
        bg="var(--apple-surface-raised)"
      >
        <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
          <Box>
            <Text as="h2" fontSize="lg" fontWeight="850" color="var(--apple-text)">
              {title}
            </Text>
            <Text color="var(--apple-muted)" fontSize="sm" fontWeight="600">
              {t("projectTable.shownSummary", {
                shown: filteredProjects.length,
                active: activeProjects,
                blocked: blockedProjects,
              })}
            </Text>
          </Box>
          <HStack gap={2} flexWrap="wrap" justify="end">
            <Badge
              bg="var(--apple-blue-soft)"
              color="var(--apple-blue)"
              border="1px solid"
              borderColor="var(--apple-blue-border)"
              borderRadius="full"
              px={3}
              py={1}
              fontWeight="800"
              textTransform="none"
            >
              {t("projectTable.total", { count: projects.length })}
            </Badge>
            <Badge
              bg="var(--apple-danger-bg)"
              color="var(--apple-danger-text)"
              border="1px solid"
              borderColor="var(--apple-danger-border)"
              borderRadius="full"
              px={3}
              py={1}
              fontWeight="800"
              textTransform="none"
            >
              {t("projectTable.blocked", { count: blockedProjects })}
            </Badge>
          </HStack>
        </HStack>

        <Grid
          gap={3}
          alignItems="end"
          bg="var(--apple-surface-subtle)"
          border="1px solid"
          borderColor="var(--apple-border-soft)"
          borderRadius="lg"
          p={3}
          templateColumns={{
            base: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "minmax(280px, 1fr) 180px 180px",
          }}
        >
          <Box minW={0} gridColumn={{ md: "1 / -1", xl: "auto" }}>
            <Input
              label={t("common.search")}
              value={query}
              onChange={(event) => handleFilterChange(setQuery, event.target.value)}
              placeholder={t("projectTable.searchPlaceholder")}
            />
          </Box>
          <Box minW={0}>
            <Text
              as="label"
              display="block"
              fontSize="sm"
              fontWeight="650"
              color="var(--apple-secondary)"
              mb={2}
            >
              {t("projectTable.columns.status")}
            </Text>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={status}
                onChange={(event) =>
                  handleFilterChange(
                    setStatus,
                    event.target.value as ProjectStatus | "all"
                  )
                }
                borderRadius="md"
                bg="var(--apple-surface)"
                borderColor="var(--apple-border)"
                _focusVisible={{
                  borderColor: "var(--apple-blue)",
                  boxShadow: "var(--focus-ring)",
                }}
                h="40px"
              >
                <option value="all">{t("projectTable.allStatuses")}</option>
                {Object.entries(statusLabelKeys).map(([value, labelKey]) => (
                  <option key={value} value={value}>
                    {t(labelKey)}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
          <Box minW={0}>
            <Text
              as="label"
              display="block"
              fontSize="sm"
              fontWeight="650"
              color="var(--apple-secondary)"
              mb={2}
            >
              {t("projectTable.columns.priority")}
            </Text>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={priority}
                onChange={(event) =>
                  handleFilterChange(
                    setPriority,
                    event.target.value as ProjectPriority | "all"
                  )
                }
                borderRadius="md"
                bg="var(--apple-surface)"
                borderColor="var(--apple-border)"
                _focusVisible={{
                  borderColor: "var(--apple-blue)",
                  boxShadow: "var(--focus-ring)",
                }}
                h="40px"
              >
                <option value="all">{t("projectTable.allPriorities")}</option>
                {Object.entries(priorityLabelKeys).map(([value, labelKey]) => (
                  <option key={value} value={value}>
                    {t(labelKey)}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
        </Grid>
      </VStack>

      {visibleProjects.length === 0 ? (
        <Box p={8}>
          <EmptyState title={emptyTitle} description={t("projectTable.adjustFilters")} />
        </Box>
      ) : (
        <Table.ScrollArea
          borderTop="1px solid"
          borderColor="var(--apple-border-soft)"
          maxH={{ base: "70vh", xl: "640px" }}
          css={{
            "&::-webkit-scrollbar": { height: "10px", width: "10px" },
            "&::-webkit-scrollbar-thumb": {
              background: "var(--apple-border)",
              borderRadius: "999px",
            },
            "&::-webkit-scrollbar-track": {
              background: "var(--apple-surface-subtle)",
            },
          }}
        >
          <Table.Root
            size="sm"
            variant="line"
            interactive
            stickyHeader
            bg="var(--apple-surface-raised)"
          >
            <Table.Header>
              <Table.Row bg="var(--apple-surface-subtle)">
                {visibleColumns.map((column) => {
                  const headerLabel =
                    columnAliases?.[String(column.key)]?.trim() ||
                    (column.labelKey ? t(column.labelKey) : column.label);
                  return (
                    <Table.ColumnHeader
                      key={column.key}
                      minW={column.minW}
                      maxW={column.maxW ?? "280px"}
                      textAlign={column.align}
                      aria-sort={
                        sort.key === column.key
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      userSelect="none"
                      color="var(--apple-muted)"
                      fontWeight="800"
                      fontSize="xs"
                      letterSpacing="0"
                      textTransform={dir === "ltr" ? "uppercase" : "none"}
                      borderColor="var(--apple-border-soft)"
                      py={2.5}
                      px={4}
                      position="relative"
                      _after={{
                        content: '""',
                        position: "absolute",
                        insetInlineEnd: 0,
                        top: "28%",
                        bottom: "28%",
                        width: "1px",
                        bg: "var(--apple-border-soft)",
                      }}
                    >
                      <HStack
                        as={column.sortable ? chakra.button : undefined}
                        width="full"
                        justify={column.align === "end" ? "end" : "start"}
                        gap={1}
                        cursor={column.sortable ? "pointer" : "default"}
                        onClick={column.sortable ? () => handleSort(column) : undefined}
                        _focusVisible={
                          column.sortable ? { boxShadow: "var(--focus-ring)" } : undefined
                        }
                      >
                        <Text as="span" truncate title={headerLabel}>
                          {headerLabel}
                        </Text>
                        {column.sortable && sort.key === column.key && (
                          <Center
                            aria-hidden="true"
                            boxSize="5"
                            borderRadius="full"
                            bg="var(--apple-blue-soft)"
                            color="var(--apple-blue)"
                            fontSize="xs"
                            fontWeight="900"
                          >
                            {sort.direction === "asc" ? "↑" : "↓"}
                          </Center>
                        )}
                      </HStack>
                    </Table.ColumnHeader>
                  );
                })}
                {(onAction || onOpenPentestWorkspace) && (
                  <Table.ColumnHeader
                    minW="100px"
                    textAlign="end"
                    color="var(--apple-muted)"
                    fontWeight="800"
                    fontSize="xs"
                    textTransform={dir === "ltr" ? "uppercase" : "none"}
                    borderColor="var(--apple-border-soft)"
                    py={2.5}
                    px={4}
                  >
                    {t("projectTable.action")}
                  </Table.ColumnHeader>
                )}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {visibleProjects.map((project) => (
                <Table.Row
                  key={project.id}
                  bg="var(--apple-surface-raised)"
                  _even={{ bg: "var(--apple-surface-subtle)" }}
                  transition="background 120ms ease, box-shadow 120ms ease"
                  cursor={onRowClick || onRowDoubleClick ? "pointer" : "default"}
                  onClick={() => onRowClick?.(project)}
                  onDoubleClick={() => onRowDoubleClick?.(project)}
                  _hover={{
                    bg: "var(--apple-surface-hover)",
                    boxShadow: `inset ${dir === "rtl" ? "-3px" : "3px"} 0 0 var(--apple-blue)`,
                  }}
                >
                  {visibleColumns.map((column) => (
                    <Table.Cell
                      key={column.key}
                      minW={column.minW}
                      maxW={column.maxW ?? "280px"}
                      textAlign={column.align}
                      verticalAlign="middle"
                      color="var(--apple-text)"
                      fontWeight="600"
                      borderColor="var(--apple-border-soft)"
                      px={{ base: 3, md: 4 }}
                      py={3}
                    >
                      <HStack
                        justify={column.align === "end" ? "end" : "start"}
                        gap={2}
                        width="full"
                      >
                        <Box minW={0} maxW="full" flex="1">
                          {column.key === "pentesters" || column.key === "qaUsers" ? (
                            onAssignPentesters && (
                              project.allowedActions?.includes("assign-pentesters") ||
                              project.allowedActions?.includes("assign-project-members")
                            ) ? (
                              <Button
                                variant="secondary"
                                minH="30px"
                                h="30px"
                                px={3}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onAssignPentesters(project);
                                }}
                              >
                                {t("projectTable.assign")}
                              </Button>
                            ) : <Text color="var(--apple-muted)">—</Text>
                          ) : column.render ? (
                            column.render(project, t)
                          ) : (
                            <DefaultProjectCell project={project} column={column} />
                          )}
                        </Box>
                        {column.key === "summary" && onCreateFromProject && (
                          <IconButton
                            aria-label={t("projectTable.createFrom", {
                              name: project.name,
                            })}
                            size="xs"
                            minW="28px"
                            h="28px"
                            borderRadius="md"
                            color="var(--apple-blue)"
                            bg="var(--apple-blue-soft)"
                            _hover={{ bg: "rgba(0, 113, 227, 0.14)" }}
                            onClick={(event) => {
                              event.stopPropagation();
                              onCreateFromProject(project);
                            }}
                          >
                            <PlusIcon />
                          </IconButton>
                        )}
                      </HStack>
                    </Table.Cell>
                  ))}
                  {(onAction || onOpenPentestWorkspace) && (
                    <Table.Cell
                      textAlign="end"
                      borderColor="var(--apple-border-soft)"
                      px={{ base: 3, md: 4 }}
                      py={3}
                    >
                      <HStack gap={2} justify="end">
                        {onOpenPentestWorkspace &&
                          project.allowedActions?.includes("open-pentest-workspace") && (
                            <Button
                              variant="secondary"
                              minH="30px"
                              h="30px"
                              px={3}
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenPentestWorkspace(project);
                              }}
                            >
                              {t("projectTable.workspace")}
                            </Button>
                          )}
                        {onAction &&
                          (!project.allowedActions ||
                            project.allowedActions.includes("view-project")) && (
                            <Button
                              variant="secondary"
                              minH="30px"
                              h="30px"
                              px={3}
                              onClick={(event) => {
                                event.stopPropagation();
                                onAction(project);
                              }}
                            >
                              {actionLabel}
                            </Button>
                          )}
                      </HStack>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}

      <HStack
        justify="space-between"
        gap={4}
        flexWrap="wrap"
        px={{ base: 4, md: 5 }}
        py={3}
        borderTop="1px solid"
        borderColor="var(--apple-border-soft)"
        bg="var(--apple-surface-subtle)"
      >
        <HStack
          gap={3}
          flexWrap="wrap"
          w={{ base: "full", sm: "auto" }}
          justify={{ base: "space-between", sm: "start" }}
        >
          <Center
            minW="38px"
            h="38px"
            borderRadius="md"
            bg="var(--apple-blue-soft)"
            border="1px solid"
            borderColor="var(--apple-blue-border)"
            color="var(--apple-blue)"
            fontWeight="850"
          >
            {currentPage}
          </Center>
          <Text color="var(--apple-muted)" fontSize="sm" fontWeight="700">
            {t("projectTable.pageOf", { page: currentPage, total: totalPages })}
          </Text>
        </HStack>
        <HStack
          gap={2}
          flexWrap="wrap"
          w={{ base: "full", sm: "auto" }}
          justify={{ base: "space-between", sm: "end" }}
        >
          <NativeSelect.Root width="100px">
            <NativeSelect.Field
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              borderRadius="md"
              bg="var(--apple-surface)"
              borderColor="var(--apple-border)"
              _focusVisible={{
                borderColor: "var(--apple-blue)",
                boxShadow: "var(--focus-ring)",
              }}
              h="38px"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {t("projectTable.rows", { count: size })}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Button
            variant="secondary"
            minH="32px"
            h="32px"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
          >
            {t("projectTable.previous")}
          </Button>
          <Button
            variant="secondary"
            minH="32px"
            h="32px"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage === totalPages}
          >
            {t("projectTable.next")}
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}
