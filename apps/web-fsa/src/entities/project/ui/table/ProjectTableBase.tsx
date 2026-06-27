import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Badge,
  Box,
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

export default function ProjectTableBase({
  projects,
  columns,
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [priority, setPriority] = useState<ProjectPriority | "all">("all");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
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
        <Table.ScrollArea borderTop="1px solid" borderColor="var(--apple-border-soft)">
          <Table.Root size="sm" variant="outline" interactive stickyHeader>
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
                  transition="background 120ms ease"
                  cursor={onRowClick || onRowDoubleClick ? "pointer" : "default"}
                  onClick={() => onRowClick?.(project)}
                  onDoubleClick={() => onRowDoubleClick?.(project)}
                  _hover={{ bg: "var(--apple-surface-hover)" }}
                >
                  {columns.map((column) => (
                    <Table.Cell
                      key={column.key}
                      textAlign={column.align}
                      verticalAlign="middle"
                      color="var(--apple-text)"
                      fontWeight="600"
                      borderColor="var(--apple-border-soft)"
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
                    <Table.Cell textAlign="end" borderColor="var(--apple-border-soft)">
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
                    <Table.Cell textAlign="end" borderColor="var(--apple-border-soft)">
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
        <Text color="var(--apple-muted)" fontSize="sm" fontWeight="700">
          {t("projectTable.pageOf", { page: currentPage, total: totalPages })}
        </Text>
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
            >
              <option value={5}>{t("projectTable.rows", { count: 5 })}</option>
              <option value={10}>{t("projectTable.rows", { count: 10 })}</option>
              <option value={20}>{t("projectTable.rows", { count: 20 })}</option>
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
