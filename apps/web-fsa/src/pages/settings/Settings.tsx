import { useState } from "react";
import { Box, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import {
  resetProjectTableVisibleColumns,
  setProjectTableColumnOrder,
  setProjectTableVisibleColumns,
  setTheme,
} from "@/features/ui-state/model/uiSlice";
import type { RootState } from "@/app/store/store";
import { useLanguage } from "@/features/language/model";
import { projectTableColumnContexts } from "@/entities/project/ui/table/columns";
import Card from "@/shared/ui/primitives/Card";
import Button from "@/shared/ui/primitives/Button";

export default function Settings() {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const [draggedColumn, setDraggedColumn] = useState<{
    paginationId: string;
    key: string;
  } | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const { theme, visibleProjectColumns, projectTableColumnOrder } = useSelector(
    (state: RootState) => state.ui
  );

  const moveColumn = (
    paginationId: string,
    keys: string[],
    index: number,
    targetIndex: number
  ) => {
    const nextKeys = [...keys];
    const [key] = nextKeys.splice(index, 1);
    nextKeys.splice(targetIndex, 0, key);
    dispatch(setProjectTableColumnOrder({ paginationId, columns: nextKeys }));
  };

  return (
    <VStack align="stretch" gap={5}>
      <Heading>{t("settings.title")}</Heading>
      <Card title={t("settings.themeState")}>
        <VStack align="start" gap={3}>
          <Text>{t("settings.currentTheme", { theme })}</Text>
          <Button
            variant="secondary"
            onClick={() => dispatch(setTheme(theme === "light" ? "dark" : "light"))}
          >
            {t("settings.toggleTheme")}
          </Button>
        </VStack>
      </Card>
      <Card title={t("settings.projectTables.title")}>
        <VStack align="stretch" gap={5}>
          <Text color="var(--apple-muted)">
            {t("settings.projectTables.description")}
          </Text>
          {projectTableColumnContexts.map((context) => {
            const defaultKeys = context.columns.map((column) => String(column.key));
            const enabledKeys = visibleProjectColumns[context.paginationId] ?? defaultKeys;
            const savedOrder = projectTableColumnOrder[context.paginationId] ?? defaultKeys;
            const orderedKeys = [
              ...savedOrder.filter((key) => defaultKeys.includes(key)),
              ...defaultKeys.filter((key) => !savedOrder.includes(key)),
            ];
            const orderedColumns = [...context.columns].sort(
              (left, right) =>
                orderedKeys.indexOf(String(left.key)) -
                orderedKeys.indexOf(String(right.key))
            );

            return (
              <Box
                key={context.paginationId}
                border="1px solid"
                borderColor="var(--apple-border-soft)"
                borderRadius="md"
                p={4}
              >
                <HStack justify="space-between" mb={3} gap={3}>
                  <Text fontWeight="800">{t(context.labelKey)}</Text>
                  <Button
                    variant="secondary"
                    onClick={() => dispatch(resetProjectTableVisibleColumns(context.paginationId))}
                  >
                    {t("settings.projectTables.reset")}
                  </Button>
                </HStack>
                <VStack align="stretch" gap={2}>
                  {orderedColumns.map((column, index) => {
                    const key = String(column.key);
                    const dropTargetId = `${context.paginationId}:${key}`;
                    const label = column.labelKey ? t(column.labelKey) : column.label;
                    return (
                      <HStack
                        key={key}
                        justify="space-between"
                        gap={3}
                        p={2}
                        border="1px solid"
                        borderColor={
                          dropTargetKey === dropTargetId
                            ? "var(--apple-blue)"
                            : "var(--apple-border-soft)"
                        }
                        borderRadius="md"
                        bg={
                          dropTargetKey === dropTargetId
                            ? "var(--apple-blue-soft)"
                            : "var(--apple-surface)"
                        }
                        opacity={
                          draggedColumn?.paginationId === context.paginationId &&
                          draggedColumn.key === key
                            ? 0.5
                            : 1
                        }
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDropTargetKey(dropTargetId);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggedColumn?.paginationId === context.paginationId) {
                            moveColumn(
                              context.paginationId,
                              orderedKeys,
                              orderedKeys.indexOf(draggedColumn.key),
                              index
                            );
                          }
                          setDraggedColumn(null);
                          setDropTargetKey(null);
                        }}
                      >
                        <Box as="label" display="flex" alignItems="center" gap={2}>
                          <input
                            type="checkbox"
                            checked={enabledKeys.includes(key)}
                            onChange={(event) =>
                              dispatch(
                                setProjectTableVisibleColumns({
                                  paginationId: context.paginationId,
                                  columns: event.target.checked
                                    ? [...enabledKeys, key]
                                    : enabledKeys.filter((enabledKey) => enabledKey !== key),
                                })
                              )
                            }
                          />
                          <Text as="span">{label}</Text>
                        </Box>
                        <Box
                          draggable
                          role="button"
                          tabIndex={0}
                          aria-label={t("settings.projectTables.reorder", { column: label })}
                          title={t("settings.projectTables.reorder", { column: label })}
                          cursor="grab"
                          color="var(--apple-muted)"
                          fontSize="xl"
                          lineHeight="1"
                          px={2}
                          userSelect="none"
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            setDraggedColumn({ paginationId: context.paginationId, key });
                          }}
                          onDragEnd={() => {
                            setDraggedColumn(null);
                            setDropTargetKey(null);
                          }}
                          onKeyDown={(event) => {
                            const offset =
                              event.key === "ArrowUp"
                                ? -1
                                : event.key === "ArrowDown"
                                  ? 1
                                  : 0;
                            const targetIndex = index + offset;
                            if (offset && targetIndex >= 0 && targetIndex < orderedKeys.length) {
                              event.preventDefault();
                              moveColumn(
                                context.paginationId,
                                orderedKeys,
                                index,
                                targetIndex
                              );
                            }
                          }}
                        >
                          ⋮⋮
                        </Box>
                      </HStack>
                    );
                  })}
                </VStack>
              </Box>
            );
          })}
        </VStack>
      </Card>
    </VStack>
  );
}
