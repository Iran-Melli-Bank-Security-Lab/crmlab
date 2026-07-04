import { useState } from "react";
import { Box, Checkbox, Heading, HStack, Input, Tabs, Text, VStack } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import {
  resetProjectTableVisibleColumns,
  resetProjectTableColumnAlias,
  setProjectTableColumnAlias,
  setProjectTableColumnOrder,
  setProjectTableVisibleColumns,
  setTheme,
} from "@/features/ui-state/model/uiSlice";
import type { RootState } from "@/app/store/store";
import { useLanguage } from "@/features/language/model";
import { projectTableColumnContexts } from "@/entities/project/ui/table/columns";
import { usePermission } from "@/features/access-control/model/usePermission";
import {
  useResetProjectTableSettingsMutation,
  useSaveProjectTableSettingsMutation,
  useSyncProjectTableSettings,
} from "@/features/ui-state/api/projectTableSettingsApi";
import Card from "@/shared/ui/primitives/Card";
import Button from "@/shared/ui/primitives/Button";

export default function Settings() {
  const { t } = useLanguage();
  const { hasPermission } = usePermission();
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  useSyncProjectTableSettings(userId);
  const [saveProjectTableSettings] = useSaveProjectTableSettingsMutation();
  const [resetProjectTableSettings] = useResetProjectTableSettingsMutation();
  const [draggedColumn, setDraggedColumn] = useState<{
    paginationId: string;
    key: string;
  } | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const {
    theme,
    visibleProjectColumns,
    projectTableColumnOrder,
    projectTableColumnAliases,
    projectTableSettingsUserId,
  } = useSelector((state: RootState) => state.ui);
  const hasCurrentUserSettings = projectTableSettingsUserId === userId;
  const scopedVisibleColumns = hasCurrentUserSettings ? visibleProjectColumns : {};
  const scopedColumnOrder = hasCurrentUserSettings ? projectTableColumnOrder : {};
  const scopedColumnAliases = hasCurrentUserSettings ? projectTableColumnAliases : {};
  const allowedContexts = projectTableColumnContexts.filter((context) =>
    hasPermission(context.permission)
  );

  const persistContext = (
    context: string,
    visibleColumns: string[],
    columnOrder: string[],
    aliases: Record<string, string>
  ) => {
    void saveProjectTableSettings({
      context,
      settings: { visibleColumns, columnOrder, aliases },
    });
  };

  const moveColumn = (
    paginationId: string,
    keys: string[],
    index: number,
    targetIndex: number,
    visibleColumns: string[],
    aliases: Record<string, string>
  ) => {
    const nextKeys = [...keys];
    const [key] = nextKeys.splice(index, 1);
    nextKeys.splice(targetIndex, 0, key);
    dispatch(setProjectTableColumnOrder({ paginationId, columns: nextKeys }));
    persistContext(paginationId, visibleColumns, nextKeys, aliases);
  };

  return (
    <VStack align="stretch" gap={5}>
      <Heading>{t("settings.title")}</Heading>
      <Box as="section" aria-labelledby="appearance-settings-title">
        <Heading id="appearance-settings-title" size="md" mb={3}>
          {t("settings.appearance.title")}
        </Heading>
        <Card title={t("settings.appearance.theme")}>
          <VStack align="start" gap={3}>
            <Text>
              {t("settings.currentTheme", {
                theme: t(theme === "light" ? "settings.theme.light" : "settings.theme.dark"),
              })}
            </Text>
            <Button
              variant="secondary"
              onClick={() => dispatch(setTheme(theme === "light" ? "dark" : "light"))}
            >
              {t(theme === "light" ? "settings.switchToDark" : "settings.switchToLight")}
            </Button>
          </VStack>
        </Card>
      </Box>

      <Box as="section" aria-labelledby="project-table-settings-title">
        <Box mb={4}>
          <Heading id="project-table-settings-title" size="md">
            {t("settings.projectTables.title")}
          </Heading>
          <Text color="var(--apple-muted)" mt={1}>
            {t("settings.projectTables.description")}
          </Text>
          <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
            {t("settings.projectTables.aliasHelp")}
          </Text>
        </Box>
        <Text fontSize="sm" fontWeight="700" mb={2}>
          {t("settings.projectTables.selectContext")}
        </Text>
        {allowedContexts.length === 0 ? (
          <Text color="var(--apple-muted)">
            {t("settings.projectTables.noContexts")}
          </Text>
        ) : (
        <Tabs.Root defaultValue={allowedContexts[0].paginationId} variant="enclosed">
          <Tabs.List overflowX="auto" overflowY="hidden" flexWrap="nowrap">
            {allowedContexts.map((context) => (
              <Tabs.Trigger
                key={context.paginationId}
                value={context.paginationId}
                flexShrink={0}
              >
                {t(context.labelKey)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {allowedContexts.map((context) => {
            const defaultKeys = context.columns.map((column) => String(column.key));
            const enabledKeys = scopedVisibleColumns[context.paginationId] ?? defaultKeys;
            const savedOrder = scopedColumnOrder[context.paginationId] ?? defaultKeys;
            const aliases = scopedColumnAliases[context.paginationId] ?? {};
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
              <Tabs.Content
                key={context.paginationId}
                value={context.paginationId}
                pt={4}
              >
              <Box
                border="1px solid"
                borderColor="var(--apple-border-soft)"
                borderRadius="md"
                p={4}
                bg="var(--apple-surface-raised)"
                boxShadow="var(--surface-shadow)"
              >
                <HStack justify="space-between" mb={3} gap={3}>
                  <Box>
                    <Text fontWeight="800">{t(context.labelKey)}</Text>
                    <Text color="var(--apple-muted)" fontSize="sm">
                      {t("settings.projectTables.visibleCount", {
                        selected: enabledKeys.length,
                        total: defaultKeys.length,
                      })}
                    </Text>
                  </Box>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      dispatch(resetProjectTableVisibleColumns(context.paginationId));
                      void resetProjectTableSettings(context.paginationId);
                    }}
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
                        flexWrap={{ base: "wrap", md: "nowrap" }}
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
                              index,
                              enabledKeys,
                              aliases
                            );
                          }
                          setDraggedColumn(null);
                          setDropTargetKey(null);
                        }}
                      >
                        <Checkbox.Root
                          display="flex"
                          alignItems="center"
                          gap={2}
                          checked={enabledKeys.includes(key)}
                          onCheckedChange={(details) => {
                            const nextVisibleColumns =
                              details.checked === true
                                ? [...enabledKeys, key]
                                : enabledKeys.filter((enabledKey) => enabledKey !== key);
                            dispatch(
                              setProjectTableVisibleColumns({
                                paginationId: context.paginationId,
                                columns: nextVisibleColumns,
                              })
                            );
                            persistContext(
                              context.paginationId,
                              nextVisibleColumns,
                              orderedKeys,
                              aliases
                            );
                          }}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                          <Checkbox.Label>{label}</Checkbox.Label>
                        </Checkbox.Root>
                        <HStack
                          gap={2}
                          flex={{ base: "1 0 100%", md: "0 1 360px" }}
                        >
                          <Input
                            size="sm"
                            value={aliases[key] ?? ""}
                            placeholder={t("settings.projectTables.aliasPlaceholder")}
                            aria-label={t("settings.projectTables.aliasLabel", {
                              column: label,
                            })}
                            onChange={(event) =>
                              dispatch(
                                setProjectTableColumnAlias({
                                  paginationId: context.paginationId,
                                  columnKey: key,
                                  alias: event.target.value,
                                })
                              )
                            }
                            onBlur={(event) => {
                              const nextAliases = { ...aliases };
                              const alias = event.target.value.trim();
                              if (alias) nextAliases[key] = alias;
                              else delete nextAliases[key];
                              persistContext(
                                context.paginationId,
                                enabledKeys,
                                orderedKeys,
                                nextAliases
                              );
                            }}
                          />
                          <Button
                            variant="secondary"
                            disabled={!aliases[key]}
                            onClick={() => {
                              const nextAliases = { ...aliases };
                              delete nextAliases[key];
                              dispatch(
                                resetProjectTableColumnAlias({
                                  paginationId: context.paginationId,
                                  columnKey: key,
                                })
                              )
                              persistContext(
                                context.paginationId,
                                enabledKeys,
                                orderedKeys,
                                nextAliases
                              );
                            }}
                          >
                            {t("settings.projectTables.resetAlias")}
                          </Button>
                        </HStack>
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
                                targetIndex,
                                enabledKeys,
                                aliases
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
              </Tabs.Content>
            );
          })}
        </Tabs.Root>
        )}
      </Box>
    </VStack>
  );
}
