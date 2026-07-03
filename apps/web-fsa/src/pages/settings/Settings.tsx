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
  const { theme, visibleProjectColumns, projectTableColumnOrder } = useSelector(
    (state: RootState) => state.ui
  );

  const moveColumn = (
    paginationId: string,
    keys: string[],
    index: number,
    offset: -1 | 1
  ) => {
    const nextKeys = [...keys];
    const targetIndex = index + offset;
    [nextKeys[index], nextKeys[targetIndex]] = [
      nextKeys[targetIndex],
      nextKeys[index],
    ];
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
                    const label = column.labelKey ? t(column.labelKey) : column.label;
                    return (
                      <HStack key={key} justify="space-between" gap={3}>
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
                        <HStack gap={2}>
                          <Button
                            variant="secondary"
                            disabled={index === 0}
                            aria-label={t("settings.projectTables.moveUp", { column: label })}
                            onClick={() =>
                              moveColumn(context.paginationId, orderedKeys, index, -1)
                            }
                          >
                            ↑
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={index === orderedColumns.length - 1}
                            aria-label={t("settings.projectTables.moveDown", { column: label })}
                            onClick={() =>
                              moveColumn(context.paginationId, orderedKeys, index, 1)
                            }
                          >
                            ↓
                          </Button>
                        </HStack>
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
