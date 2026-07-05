import { memo, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Heading,
  HStack,
  Input,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
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
import {
  useGetProjectTableColumnRegistryQuery,
  useResetProjectTableSettingsMutation,
  useSaveProjectTableSettingsMutation,
  useSyncProjectTableSettings,
} from "@/features/ui-state/api/projectTableSettingsApi";

type ColumnAliasEditorProps = {
  dir: "ltr" | "rtl";
  value: string;
  placeholder: string;
  ariaLabel: string;
  saveLabel: string;
  clearLabel: string;
  onSave: (alias: string) => void;
  onClear: () => void;
};

const ColumnAliasEditor = memo(function ColumnAliasEditor({
  dir,
  value,
  placeholder,
  ariaLabel,
  saveLabel,
  clearLabel,
  onSave,
  onClear,
}: ColumnAliasEditorProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const normalizedDraft = draft.trim();

  return (
    <Box
      dir={dir}
      display="grid"
      gridTemplateColumns={{
        base: "minmax(0, 1fr) auto",
        lg: "minmax(0, 1fr) auto auto",
      }}
      gap={2}
      gridColumn={{ base: "1 / -1", lg: "auto" }}
      alignItems="center"
      width="full"
    >
      <Input
        dir={dir}
        textAlign={dir === "rtl" ? "right" : "left"}
        gridColumn={{ base: "1 / -1", lg: "auto" }}
        minW={0}
        size="sm"
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.target.value)}
      />
      <Button
        colorPalette="blue"
        size="xs"
        whiteSpace="nowrap"
        disabled={normalizedDraft === value}
        onClick={() => {
          setDraft(normalizedDraft);
          onSave(normalizedDraft);
        }}
      >
        {saveLabel}
      </Button>
      <Button
        variant="ghost"
        size="xs"
        whiteSpace="nowrap"
        disabled={!draft}
        onClick={() => {
          setDraft("");
          onClear();
        }}
      >
        {clearLabel}
      </Button>
    </Box>
  );
});

export default function Settings() {
  const { dir, language, t } = useLanguage();
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  useSyncProjectTableSettings(userId);
  const { data: columnRegistry } = useGetProjectTableColumnRegistryQuery(userId || "", {
    skip: !userId,
  });
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
  const allowedContexts = (columnRegistry?.contexts || []).map((context) => ({
    ...context,
    paginationId: context.context,
    label: language === "fa" ? context.faLabel : context.defaultLabel,
    columns: context.columns
      .filter((column) => column.isConfigurable && !column.isSensitive)
      .sort((left, right) => left.defaultOrder - right.defaultOrder),
  }));

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
        <Card.Root variant="outline" size="sm">
          <Card.Body>
            <HStack justify="space-between" gap={4} flexWrap="wrap">
              <Box>
                <Text fontWeight="700">{t("settings.appearance.theme")}</Text>
                <Text color="var(--apple-muted)" fontSize="sm">
                  {t("settings.currentTheme", {
                    theme: t(
                      theme === "light" ? "settings.theme.light" : "settings.theme.dark"
                    ),
                  })}
                </Text>
              </Box>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(setTheme(theme === "light" ? "dark" : "light"))}
              >
                {t(
                  theme === "light" ? "settings.switchToDark" : "settings.switchToLight"
                )}
              </Button>
            </HStack>
          </Card.Body>
        </Card.Root>
      </Box>

      <Box
        as="section"
        aria-labelledby="table-settings-title"
        dir={dir}
        textAlign={dir === "rtl" ? "right" : "left"}
      >
        <Box mb={4}>
          <Heading id="table-settings-title" size="md">
            {t("settings.tables.title")}
          </Heading>
          <Text color="var(--apple-muted)" fontSize="sm" mt={1} maxW="3xl">
            {t("settings.tables.description")}
          </Text>
        </Box>
        <Text fontSize="sm" fontWeight="700" mb={2}>
          {t("settings.tables.selectContext")}
        </Text>
        {allowedContexts.length === 0 ? (
          <Text color="var(--apple-muted)">{t("settings.tables.noContexts")}</Text>
        ) : (
          <Tabs.Root
            defaultValue={allowedContexts[0].paginationId}
            variant="enclosed"
            size="sm"
            dir={dir}
          >
            <Tabs.List
              dir={dir}
              overflowX="auto"
              overflowY="hidden"
              flexWrap="nowrap"
              gap={1}
            >
              {allowedContexts.map((context) => (
                <Tabs.Trigger
                  key={context.paginationId}
                  value={context.paginationId}
                  flexShrink={0}
                  whiteSpace="nowrap"
                  textAlign="center"
                >
                  {context.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {allowedContexts.map((context) => {
              const allKeys = context.columns.map((column) => column.columnKey);
              const defaultKeys = context.columns
                .filter((column) => column.isDefaultVisible)
                .map((column) => column.columnKey);
              const enabledKeys =
                scopedVisibleColumns[context.paginationId] ?? defaultKeys;
              const savedOrder = scopedColumnOrder[context.paginationId] ?? allKeys;
              const aliases = scopedColumnAliases[context.paginationId] ?? {};
              const orderedKeys = [
                ...savedOrder.filter((key) => allKeys.includes(key)),
                ...allKeys.filter((key) => !savedOrder.includes(key)),
              ];
              const orderedColumns = [...context.columns].sort(
                (left, right) =>
                  orderedKeys.indexOf(left.columnKey) -
                  orderedKeys.indexOf(right.columnKey)
              );

              return (
                <Tabs.Content
                  key={context.paginationId}
                  value={context.paginationId}
                  pt={4}
                  dir={dir}
                  textAlign={dir === "rtl" ? "right" : "left"}
                >
                  <Box
                    dir={dir}
                    border="1px solid"
                    borderColor="var(--apple-border-soft)"
                    borderRadius="md"
                    p={4}
                    bg="var(--apple-surface-raised)"
                    boxShadow="var(--surface-shadow)"
                  >
                    <HStack justify="space-between" mb={4} gap={3} flexWrap="wrap">
                      <Box>
                        <Text fontWeight="800">{context.label}</Text>
                        <Badge variant="subtle" colorPalette="blue" mt={1}>
                          {t("settings.projectTables.visibleCount", {
                            selected: enabledKeys.length,
                            total: allKeys.length,
                          })}
                        </Badge>
                      </Box>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          dispatch(resetProjectTableVisibleColumns(context.paginationId));
                          void resetProjectTableSettings(context.paginationId);
                        }}
                      >
                        {t("settings.projectTables.restoreDefaults")}
                      </Button>
                    </HStack>
                    <Box
                      display={{ base: "none", lg: "grid" }}
                      gridTemplateColumns="minmax(180px, 1fr) minmax(240px, 360px) 64px"
                      gap={3}
                      px={3}
                      pb={2}
                    >
                      <Text color="var(--apple-muted)" fontSize="xs" fontWeight="700">
                        {t("settings.projectTables.column")}
                      </Text>
                      <Text color="var(--apple-muted)" fontSize="xs" fontWeight="700">
                        {t("settings.projectTables.displayLabel")}
                      </Text>
                      <Text color="var(--apple-muted)" fontSize="xs" fontWeight="700">
                        {t("settings.projectTables.order")}
                      </Text>
                    </Box>
                    <VStack align="stretch" gap={2}>
                      {orderedColumns.map((column, index) => {
                        const key = column.columnKey;
                        const dropTargetId = `${context.paginationId}:${key}`;
                        const label =
                          language === "fa" ? column.faLabel : column.defaultLabel;
                        return (
                          <Box
                            key={key}
                            display="grid"
                            gridTemplateColumns={{
                              base: "minmax(0, 1fr) auto",
                              lg: "minmax(180px, 1fr) minmax(240px, 360px) 64px",
                            }}
                            dir={dir}
                            textAlign={dir === "rtl" ? "right" : "left"}
                            alignItems="center"
                            gap={3}
                            px={3}
                            py={2}
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
                              dir={dir}
                              display="flex"
                              alignItems="center"
                              gap={2}
                              checked={enabledKeys.includes(key)}
                              onCheckedChange={(details) => {
                                const nextVisibleColumns =
                                  details.checked === true
                                    ? [...enabledKeys, key]
                                    : enabledKeys.filter(
                                        (enabledKey) => enabledKey !== key
                                      );
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
                            <ColumnAliasEditor
                              dir={dir}
                              value={aliases[key] ?? ""}
                              placeholder={t("settings.projectTables.aliasPlaceholder")}
                              ariaLabel={t("settings.projectTables.aliasLabel", {
                                column: label,
                              })}
                              saveLabel={t("settings.projectTables.saveAlias")}
                              clearLabel={t("settings.projectTables.clearAlias")}
                              onSave={(alias) => {
                                const nextAliases = { ...aliases };
                                if (alias) nextAliases[key] = alias;
                                else delete nextAliases[key];
                                dispatch(
                                  setProjectTableColumnAlias({
                                    paginationId: context.paginationId,
                                    columnKey: key,
                                    alias,
                                  })
                                );
                                persistContext(
                                  context.paginationId,
                                  enabledKeys,
                                  orderedKeys,
                                  nextAliases
                                );
                              }}
                              onClear={() => {
                                if (!aliases[key]) return;
                                const nextAliases = { ...aliases };
                                delete nextAliases[key];
                                dispatch(
                                  resetProjectTableColumnAlias({
                                    paginationId: context.paginationId,
                                    columnKey: key,
                                  })
                                );
                                persistContext(
                                  context.paginationId,
                                  enabledKeys,
                                  orderedKeys,
                                  nextAliases
                                );
                              }}
                            />
                            <Box
                              draggable
                              role="button"
                              tabIndex={0}
                              aria-label={t("settings.projectTables.reorder", {
                                column: label,
                              })}
                              title={t("settings.projectTables.reorder", {
                                column: label,
                              })}
                              cursor="grab"
                              color="var(--apple-muted)"
                              fontSize="xl"
                              lineHeight="1"
                              px={2}
                              py={1}
                              borderRadius="sm"
                              justifySelf="end"
                              _hover={{ bg: "var(--apple-surface-hover)" }}
                              userSelect="none"
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                setDraggedColumn({
                                  paginationId: context.paginationId,
                                  key,
                                });
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
                                if (
                                  offset &&
                                  targetIndex >= 0 &&
                                  targetIndex < orderedKeys.length
                                ) {
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
                              <HStack gap={1} justify="end">
                                <Text fontSize="xs" fontWeight="700">
                                  {index + 1}
                                </Text>
                                <Text aria-hidden>⋮⋮</Text>
                              </HStack>
                            </Box>
                          </Box>
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
