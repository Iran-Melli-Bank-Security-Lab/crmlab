import { useMemo } from "react";
import type { TaskContract, TaskPriority, TaskStatus } from "@role-dashboard/contracts";
import { Badge, Box, Table, Text, VStack } from "@chakra-ui/react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";
import { useGetTasksQuery } from "@/entities/task/api/tasksApi";
import {
  useGetProjectTableColumnRegistryQuery,
  useSyncProjectTableSettings,
} from "@/features/ui-state/api/projectTableSettingsApi";
import { useLanguage, type TranslationKey } from "@/features/language/model";
import EmptyState from "@/shared/ui/feedback/EmptyState";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import PageHeader from "@/shared/ui/layout/PageHeader";

type TaskColumnKey =
  | "title"
  | "description"
  | "assignee"
  | "priority"
  | "status"
  | "deadline"
  | "createdAt"
  | "updatedAt";

const TASK_CONTEXT = "tasks";
const DEFAULT_COLUMNS: TaskColumnKey[] = [
  "title",
  "description",
  "assignee",
  "priority",
  "status",
  "deadline",
  "createdAt",
  "updatedAt",
];

const columnLabelKeys: Record<TaskColumnKey, TranslationKey> = {
  title: "tasks.columns.title",
  description: "tasks.columns.description",
  assignee: "tasks.columns.assignee",
  priority: "tasks.columns.priority",
  status: "tasks.columns.status",
  deadline: "tasks.columns.deadline",
  createdAt: "tasks.columns.createdAt",
  updatedAt: "tasks.columns.updatedAt",
};

const priorityLabelKeys: Record<TaskPriority, TranslationKey> = {
  low: "tasks.priority.low",
  medium: "tasks.priority.medium",
  high: "tasks.priority.high",
  critical: "tasks.priority.critical",
};

const statusLabelKeys: Record<TaskStatus, TranslationKey> = {
  todo: "tasks.status.todo",
  in_progress: "tasks.status.inProgress",
  completed: "tasks.status.completed",
  cancelled: "tasks.status.cancelled",
};

const priorityStyles: Record<TaskPriority, { bg: string; color: string }> = {
  low: { bg: "var(--apple-surface-hover)", color: "var(--apple-secondary)" },
  medium: { bg: "var(--apple-blue-soft)", color: "var(--apple-blue)" },
  high: { bg: "var(--apple-warning-bg)", color: "var(--apple-warning-text)" },
  critical: { bg: "var(--apple-danger-bg)", color: "var(--apple-danger-text)" },
};

const statusStyles: Record<TaskStatus, { bg: string; color: string }> = {
  todo: { bg: "var(--apple-surface-hover)", color: "var(--apple-secondary)" },
  in_progress: { bg: "var(--apple-blue-soft)", color: "var(--apple-blue)" },
  completed: { bg: "var(--apple-success-bg)", color: "var(--apple-success-text)" },
  cancelled: { bg: "var(--apple-danger-bg)", color: "var(--apple-danger-text)" },
};

function isTaskColumnKey(key: string): key is TaskColumnKey {
  return DEFAULT_COLUMNS.includes(key as TaskColumnKey);
}

function formatDate(value: string, language: "en" | "fa") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getAssigneeName(task: TaskContract) {
  if (!task.assignee) return task.assigneeId;
  return (
    [task.assignee.firstName, task.assignee.lastName].filter(Boolean).join(" ") ||
    task.assignee.username ||
    task.assigneeId
  );
}

function TaskBadge({
  label,
  style,
}: {
  label: string;
  style: { bg: string; color: string };
}) {
  return (
    <Badge
      bg={style.bg}
      color={style.color}
      borderRadius="full"
      fontSize="xs"
      fontWeight="750"
      px={2.5}
      py={1}
      textTransform="none"
      whiteSpace="nowrap"
    >
      {label}
    </Badge>
  );
}

function TaskCell({
  column,
  task,
  language,
  t,
}: {
  column: TaskColumnKey;
  task: TaskContract;
  language: "en" | "fa";
  t: (key: TranslationKey) => string;
}) {
  switch (column) {
    case "title":
      return (
        <Text fontWeight="800" color="var(--apple-text)" truncate title={task.title}>
          {task.title || "—"}
        </Text>
      );
    case "description":
      return (
        <Text color="var(--apple-secondary)" lineClamp={2} title={task.description}>
          {task.description || "—"}
        </Text>
      );
    case "assignee":
      return (
        <Box>
          <Text fontWeight="700" maxW="220px" truncate>
            {getAssigneeName(task)}
          </Text>
          {task.assignee?.username && (
            <Text color="var(--apple-muted)" fontSize="xs">
              @{task.assignee.username}
            </Text>
          )}
        </Box>
      );
    case "priority":
      return (
        <TaskBadge
          label={t(priorityLabelKeys[task.priority])}
          style={priorityStyles[task.priority]}
        />
      );
    case "status":
      return (
        <TaskBadge
          label={t(statusLabelKeys[task.status])}
          style={statusStyles[task.status]}
        />
      );
    case "deadline":
    case "createdAt":
    case "updatedAt":
      return (
        <Text color="var(--apple-secondary)" fontSize="sm" whiteSpace="nowrap">
          {formatDate(task[column], language)}
        </Text>
      );
  }
}

export default function Tasks() {
  const { dir, language, t } = useLanguage();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const projectTableSettingsUserId = useSelector(
    (state: RootState) => state.ui.projectTableSettingsUserId
  );
  const configuredVisibleColumns = useSelector(
    (state: RootState) => state.ui.visibleProjectColumns[TASK_CONTEXT]
  );
  const configuredColumnOrder = useSelector(
    (state: RootState) => state.ui.projectTableColumnOrder[TASK_CONTEXT]
  );
  const configuredAliases = useSelector(
    (state: RootState) => state.ui.projectTableColumnAliases[TASK_CONTEXT]
  );
  const { data: tasks = [], error, isLoading } = useGetTasksQuery();
  useSyncProjectTableSettings(userId);
  const { data: registry } = useGetProjectTableColumnRegistryQuery(userId || "", {
    skip: !userId,
  });
  const hasCurrentUserSettings = projectTableSettingsUserId === userId;
  const visibleColumnSettings = hasCurrentUserSettings
    ? configuredVisibleColumns
    : undefined;
  const columnOrderSettings = hasCurrentUserSettings
    ? configuredColumnOrder
    : undefined;
  const aliases = hasCurrentUserSettings ? configuredAliases || {} : {};

  const columns = useMemo(() => {
    const definitions = registry?.contexts
      .find((context) => context.context === TASK_CONTEXT)
      ?.columns.filter(
        (column) => column.isConfigurable && isTaskColumnKey(column.columnKey)
      )
      .sort((left, right) => left.defaultOrder - right.defaultOrder);
    const available = definitions?.length
      ? definitions
      : DEFAULT_COLUMNS.map((columnKey, defaultOrder) => ({
          columnKey,
          defaultLabel: t(columnLabelKeys[columnKey]),
          faLabel: t(columnLabelKeys[columnKey]),
          isDefaultVisible: true,
          defaultOrder,
          minWidth:
            columnKey === "title" || columnKey === "description" ? "240px" : "140px",
          maxWidth: undefined,
        }));
    const visibleKeys =
      visibleColumnSettings ??
      available
        .filter((column) => column.isDefaultVisible)
        .map((column) => column.columnKey);
    const orderedKeys =
      columnOrderSettings ?? available.map((column) => column.columnKey);
    const positions = new Map(orderedKeys.map((key, index) => [key, index]));

    return available
      .filter((column) => visibleKeys.includes(column.columnKey))
      .sort(
        (left, right) =>
          (positions.get(left.columnKey) ?? available.length) -
          (positions.get(right.columnKey) ?? available.length)
      );
  }, [columnOrderSettings, registry?.contexts, t, visibleColumnSettings]);

  return (
    <VStack align="stretch" gap={{ base: 4, md: 5 }} dir={dir}>
      <PageHeader
        eyebrow={t("tasks.badge")}
        title={t("tasks.title")}
        description={t("tasks.description")}
        meta={!isLoading && !error ? (
          <Badge
            bg="var(--apple-surface-raised)"
            border="1px solid"
            borderColor="var(--apple-border)"
            borderRadius="full"
            color="var(--apple-secondary)"
            px={3}
            py={1.5}
            textTransform="none"
          >
            {t("tasks.total", { count: tasks.length })}
          </Badge>
        ) : undefined}
      />

      {isLoading && <LoadingScreen text={t("tasks.loading")} />}
      {error && <ErrorState error={error} title={t("tasks.errorTitle")} />}
      {!isLoading && !error && tasks.length === 0 && (
        <EmptyState
          title={t("tasks.emptyTitle")}
          description={t("tasks.emptyDescription")}
        />
      )}

      {!isLoading && !error && tasks.length > 0 && (
        <Box
          bg="var(--apple-surface-raised)"
          border="1px solid"
          borderColor="var(--apple-border)"
          borderRadius="xl"
          boxShadow="0 8px 28px rgba(15, 23, 42, 0.06)"
          overflow="hidden"
        >
          <Table.ScrollArea maxH="70vh">
            <Table.Root size="sm" variant="line" stickyHeader>
              <Table.Header>
                <Table.Row bg="var(--apple-surface-subtle)">
                  {columns.map((column) => {
                    const key = column.columnKey as TaskColumnKey;
                    const label =
                      aliases[key]?.trim() ||
                      (language === "fa" ? column.faLabel : column.defaultLabel);
                    return (
                      <Table.ColumnHeader
                        key={key}
                        color="var(--apple-muted)"
                        borderColor="var(--apple-border-soft)"
                        fontSize="xs"
                        fontWeight="800"
                        minW={column.minWidth || "140px"}
                        maxW={column.maxWidth}
                        px={4}
                        py={3}
                        textTransform={dir === "ltr" ? "uppercase" : "none"}
                      >
                        <Text truncate title={label}>
                          {label}
                        </Text>
                      </Table.ColumnHeader>
                    );
                  })}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {tasks.map((task) => (
                  <Table.Row
                    key={task.id}
                    bg="var(--apple-surface-raised)"
                    _even={{ bg: "var(--apple-surface-subtle)" }}
                    _hover={{
                      bg: "var(--apple-surface-hover)",
                      boxShadow: `inset ${dir === "rtl" ? "-3px" : "3px"} 0 0 var(--apple-blue)`,
                    }}
                  >
                    {columns.map((column) => (
                      <Table.Cell
                        key={column.columnKey}
                        minW={column.minWidth || "140px"}
                        maxW={column.maxWidth}
                        px={4}
                        py={3.5}
                        borderColor="var(--apple-border-soft)"
                      >
                        <TaskCell
                          column={column.columnKey as TaskColumnKey}
                          task={task}
                          language={language}
                          t={t}
                        />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Box>
      )}
    </VStack>
  );
}
