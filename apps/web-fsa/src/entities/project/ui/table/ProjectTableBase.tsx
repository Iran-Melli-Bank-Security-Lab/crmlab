import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Badge,
  Box,
  Center,
  HStack,
  IconButton,
  NativeSelect,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import { useLanguage } from "@/features/language/model";
import type { TranslationKey } from "@/features/language/model";
import type { ProjectPriority, ProjectStatus } from "@/shared/types";
import { getDefaultSortValue, normalize } from "./formatters";
import { PlusIcon } from "./icons";
import type { ProjectTableBaseProps, ProjectTableColumn, SortDirection } from "./types";

const statusLabelKeys: Record<ProjectStatus, TranslationKey> = {
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
      page:
        Number.isInteger(storedPage) && storedPage > 0
          ? storedPage
          : 1,
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
  onRowClick,
  onRowDoubleClick,
  onCreateFromProject,
  onAssignPentesters,
}: ProjectTableBaseProps) {
  const { t } = useLanguage();
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
    key: "dueDate",
    direction: "asc",
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
  const visibleProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const activeProjects = projects.filter((project) => project.status === "active").length;
  const blockedProjects = projects.filter(
    (project) => project.status === "blocked"
  ).length;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
      borderRadius="md"
      boxShadow="var(--surface-shadow)"
      overflow="hidden"
      backdropFilter="blur(18px)"
      transition="box-shadow 160ms ease, border-color 160ms ease"
      _hover={{ boxShadow: "var(--surface-shadow-hover)" }}
    >
      <VStack
        align="stretch"
        gap={5}
        p={5}
        borderBottom="1px solid"
        borderColor="var(--apple-border-soft)"
        bg="var(--apple-surface-glass)"
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
          <HStack gap={2} flexWrap="wrap">
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

        <HStack gap={3} align="end" flexWrap="wrap">
          <Box flex="1" minW={{ base: "full", md: "280px" }}>
            <Input
              label={t("common.search")}
              value={query}
              onChange={(event) => handleFilterChange(setQuery, event.target.value)}
              placeholder={t("projectTable.searchPlaceholder")}
            />
          </Box>
          <Box minW="160px">
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
          <Box minW="160px">
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
        </HStack>
      </VStack>

      {visibleProjects.length === 0 ? (
        <Box p={8}>
          <EmptyState
            title={emptyTitle}
            description={t("projectTable.adjustFilters")}
          />
        </Box>
      ) : (
        <Table.ScrollArea
          borderTop="1px solid"
          borderColor="var(--apple-border-soft)"
          maxH="620px"
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
                {columns.map((column) => (
                  <Table.ColumnHeader
                    key={column.key}
                    minW={column.minW}
                    textAlign={column.align}
                    cursor={column.sortable ? "pointer" : "default"}
                    onClick={() => handleSort(column)}
                    userSelect="none"
                    color="var(--apple-muted)"
                    fontWeight="800"
                    fontSize="xs"
                    letterSpacing="0"
                    textTransform="uppercase"
                    borderColor="var(--apple-border-soft)"
                    py={3}
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
                    <HStack justify={column.align === "end" ? "end" : "start"} gap={1}>
                      <span>{column.labelKey ? t(column.labelKey) : column.label}</span>
                      {column.sortable && sort.key === column.key && (
                        <span>{sort.direction === "asc" ? "↑" : "↓"}</span>
                      )}
                    </HStack>
                  </Table.ColumnHeader>
                ))}
                {onAssignPentesters && (
                  <Table.ColumnHeader
                    minW="150px"
                    textAlign="end"
                    color="var(--apple-muted)"
                    fontWeight="800"
                    fontSize="xs"
                    textTransform="uppercase"
                    borderColor="var(--apple-border-soft)"
                    py={3}
                    px={4}
                  >
                    {t("projectTable.pentesters")}
                  </Table.ColumnHeader>
                )}
                {onAction && (
                  <Table.ColumnHeader
                    minW="100px"
                    textAlign="end"
                    color="var(--apple-muted)"
                    fontWeight="800"
                    fontSize="xs"
                    textTransform="uppercase"
                    borderColor="var(--apple-border-soft)"
                    py={3}
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
                  transition="background 120ms ease, box-shadow 120ms ease"
                  cursor={onRowClick || onRowDoubleClick ? "pointer" : "default"}
                  onClick={() => onRowClick?.(project)}
                  onDoubleClick={() => onRowDoubleClick?.(project)}
                  _hover={{
                    bg: "var(--apple-surface-hover)",
                    boxShadow: "inset 3px 0 0 var(--apple-blue)",
                  }}
                >
                  {columns.map((column) => (
                    <Table.Cell
                      key={column.key}
                      textAlign={column.align}
                      verticalAlign="middle"
                      color="var(--apple-text)"
                      fontWeight="600"
                      borderColor="var(--apple-border-soft)"
                      px={4}
                      py={4}
                    >
                      <HStack
                        justify={column.align === "end" ? "end" : "start"}
                        gap={2}
                      >
                        <Box minW={0}>
                          {column.render
                            ? column.render(project, t)
                            : getDefaultSortValue(project, column.key)}
                        </Box>
                        {column.key === "summary" && onCreateFromProject && (
                          <IconButton
                            aria-label={t("projectTable.createFrom", { name: project.name })}
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
                  {onAssignPentesters && (
                    <Table.Cell
                      textAlign="end"
                      borderColor="var(--apple-border-soft)"
                      px={4}
                      py={4}
                    >
                      <Button
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAssignPentesters(project);
                        }}
                      >
                        {t("projectTable.assign")}
                      </Button>
                    </Table.Cell>
                  )}
                  {onAction && (
                    <Table.Cell
                      textAlign="end"
                      borderColor="var(--apple-border-soft)"
                      px={4}
                      py={4}
                    >
                      <Button
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAction(project);
                        }}
                      >
                        {actionLabel}
                      </Button>
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
        p={4}
        borderTop="1px solid"
        borderColor="var(--apple-border-soft)"
        bg="var(--apple-surface-subtle)"
      >
        <HStack gap={3} flexWrap="wrap">
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
        <HStack gap={3} flexWrap="wrap">
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
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
          >
            {t("projectTable.previous")}
          </Button>
          <Button
            variant="secondary"
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
