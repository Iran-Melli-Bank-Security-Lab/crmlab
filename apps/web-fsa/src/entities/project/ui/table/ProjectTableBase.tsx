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
import type { ProjectPriority, ProjectStatus } from "@/shared/types";
import { getDefaultSortValue, normalize } from "./formatters";
import { PlusIcon } from "./icons";
import type { ProjectTableBaseProps, ProjectTableColumn, SortDirection } from "./types";

const statusLabels: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  blocked: "Blocked",
  review: "In review",
  completed: "Completed",
};

const priorityLabels: Record<ProjectPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export default function ProjectTableBase({
  projects,
  columns,
  title = "Projects",
  emptyTitle = "No projects found",
  actionLabel = "Open",
  onAction,
  onCreateFromProject,
  onAssignPentesters,
}: ProjectTableBaseProps) {
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
      bg="rgba(255, 255, 255, 0.92)"
      border="1px solid"
      borderColor="rgba(0, 0, 0, 0.12)"
      borderRadius="md"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04), 0 10px 28px rgba(0, 0, 0, 0.06)"
      overflow="hidden"
      backdropFilter="blur(18px)"
    >
      <VStack
        align="stretch"
        gap={5}
        p={5}
        borderBottom="1px solid"
        borderColor="rgba(0, 0, 0, 0.08)"
        bg="rgba(255, 255, 255, 0.72)"
      >
        <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
          <Box>
            <Text as="h2" fontSize="lg" fontWeight="850" color="#1d1d1f">
              {title}
            </Text>
            <Text color="#6e6e73" fontSize="sm" fontWeight="600">
              {filteredProjects.length} shown · {activeProjects} active ·{" "}
              {blockedProjects} blocked
            </Text>
          </Box>
          <HStack gap={2} flexWrap="wrap">
            <Badge
              bg="rgba(0, 113, 227, 0.08)"
              color="#0071e3"
              border="1px solid"
              borderColor="rgba(0, 113, 227, 0.16)"
              borderRadius="full"
              px={3}
              py={1}
              fontWeight="800"
              textTransform="none"
            >
              {projects.length} total
            </Badge>
            <Badge
              bg="#fff1f0"
              color="#b42318"
              border="1px solid"
              borderColor="rgba(180, 35, 24, 0.2)"
              borderRadius="full"
              px={3}
              py={1}
              fontWeight="800"
              textTransform="none"
            >
              {blockedProjects} blocked
            </Badge>
          </HStack>
        </HStack>

        <HStack gap={3} align="end" flexWrap="wrap">
          <Box flex="1" minW={{ base: "full", md: "280px" }}>
            <Input
              label="Search"
              value={query}
              onChange={(event) => handleFilterChange(setQuery, event.target.value)}
              placeholder="Search projects, clients, owners, repositories"
            />
          </Box>
          <Box minW="160px">
            <Text
              as="label"
              display="block"
              fontSize="sm"
              fontWeight="650"
              color="#424245"
              mb={2}
            >
              Status
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
                bg="#ffffff"
                borderColor="rgba(0, 0, 0, 0.12)"
                _focusVisible={{
                  borderColor: "#0071e3",
                  boxShadow: "0 0 0 3px rgba(0, 113, 227, 0.18)",
                }}
              >
                <option value="all">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
              color="#424245"
              mb={2}
            >
              Priority
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
                bg="#ffffff"
                borderColor="rgba(0, 0, 0, 0.12)"
                _focusVisible={{
                  borderColor: "#0071e3",
                  boxShadow: "0 0 0 3px rgba(0, 113, 227, 0.18)",
                }}
              >
                <option value="all">All priorities</option>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
            description="Adjust the search or filters to see more projects."
          />
        </Box>
      ) : (
        <Table.ScrollArea borderTop="1px solid" borderColor="rgba(0, 0, 0, 0.08)">
          <Table.Root size="sm" variant="outline" interactive stickyHeader>
            <Table.Header>
              <Table.Row bg="#fbfbfd">
                {columns.map((column) => (
                  <Table.ColumnHeader
                    key={column.key}
                    minW={column.minW}
                    textAlign={column.align}
                    cursor={column.sortable ? "pointer" : "default"}
                    onClick={() => handleSort(column)}
                    userSelect="none"
                    color="#6e6e73"
                    fontWeight="800"
                    fontSize="xs"
                    letterSpacing="0"
                    textTransform="uppercase"
                    borderColor="rgba(0, 0, 0, 0.08)"
                  >
                    <HStack justify={column.align === "end" ? "end" : "start"} gap={1}>
                      <span>{column.label}</span>
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
                    color="#6e6e73"
                    fontWeight="800"
                    fontSize="xs"
                    textTransform="uppercase"
                    borderColor="rgba(0, 0, 0, 0.08)"
                  >
                    Pentesters
                  </Table.ColumnHeader>
                )}
                {onAction && (
                  <Table.ColumnHeader
                    minW="100px"
                    textAlign="end"
                    color="#6e6e73"
                    fontWeight="800"
                    fontSize="xs"
                    textTransform="uppercase"
                    borderColor="rgba(0, 0, 0, 0.08)"
                  >
                    Action
                  </Table.ColumnHeader>
                )}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {visibleProjects.map((project) => (
                <Table.Row
                  key={project.id}
                  bg="rgba(255, 255, 255, 0.86)"
                  transition="background 120ms ease"
                  _hover={{ bg: "#f5f5f7" }}
                >
                  {columns.map((column) => (
                    <Table.Cell
                      key={column.key}
                      textAlign={column.align}
                      verticalAlign="middle"
                      color="#1d1d1f"
                      fontWeight="600"
                      borderColor="rgba(0, 0, 0, 0.06)"
                    >
                      <HStack
                        justify={column.align === "end" ? "end" : "start"}
                        gap={2}
                      >
                        <Box minW={0}>
                          {column.render
                            ? column.render(project)
                            : getDefaultSortValue(project, column.key)}
                        </Box>
                        {column.key === "summary" && onCreateFromProject && (
                          <IconButton
                            aria-label={`Create another project from ${project.name}`}
                            size="xs"
                            minW="28px"
                            h="28px"
                            borderRadius="md"
                            color="#0071e3"
                            bg="rgba(0, 113, 227, 0.08)"
                            _hover={{ bg: "rgba(0, 113, 227, 0.14)" }}
                            onClick={() => onCreateFromProject(project)}
                          >
                            <PlusIcon />
                          </IconButton>
                        )}
                      </HStack>
                    </Table.Cell>
                  ))}
                  {onAssignPentesters && (
                    <Table.Cell textAlign="end" borderColor="rgba(0, 0, 0, 0.06)">
                      <Button
                        variant="secondary"
                        onClick={() => onAssignPentesters(project)}
                      >
                        Assign
                      </Button>
                    </Table.Cell>
                  )}
                  {onAction && (
                    <Table.Cell textAlign="end" borderColor="rgba(0, 0, 0, 0.06)">
                      <Button variant="secondary" onClick={() => onAction(project)}>
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
        borderColor="rgba(0, 0, 0, 0.08)"
        bg="#fbfbfd"
      >
        <Text color="#6e6e73" fontSize="sm" fontWeight="700">
          Page {currentPage} of {totalPages}
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
              bg="#ffffff"
              borderColor="rgba(0, 0, 0, 0.12)"
              _focusVisible={{
                borderColor: "#0071e3",
                boxShadow: "0 0 0 3px rgba(0, 113, 227, 0.18)",
              }}
            >
              <option value={5}>5 rows</option>
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Button
            variant="secondary"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}
