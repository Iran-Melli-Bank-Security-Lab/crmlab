import { Box, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import {
  resetProjectTableVisibleColumns,
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
  const { theme, visibleProjectColumns } = useSelector((state: RootState) => state.ui);

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
                <HStack align="start" gap={4} flexWrap="wrap">
                  {context.columns.map((column) => {
                    const key = String(column.key);
                    return (
                      <Box as="label" key={key} display="flex" alignItems="center" gap={2}>
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
                        <Text as="span">
                          {column.labelKey ? t(column.labelKey) : column.label}
                        </Text>
                      </Box>
                    );
                  })}
                </HStack>
              </Box>
            );
          })}
        </VStack>
      </Card>
    </VStack>
  );
}
