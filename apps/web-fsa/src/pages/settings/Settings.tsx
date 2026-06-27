import { Heading, Text, VStack } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { setTheme } from "@/features/ui-state/model/uiSlice";
import type { RootState } from "@/app/store/store";
import { useLanguage } from "@/features/language/model";
import Card from "@/shared/ui/primitives/Card";
import Button from "@/shared/ui/primitives/Button";

export default function Settings() {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { theme } = useSelector((state: RootState) => state.ui);

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
    </VStack>
  );
}
