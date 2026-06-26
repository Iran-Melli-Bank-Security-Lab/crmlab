import { Heading, Text, VStack } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { setTheme } from "@/features/ui-state/model/uiSlice";
import type { RootState } from "@/app/store/store";
import Card from "@/shared/ui/primitives/Card";
import Button from "@/shared/ui/primitives/Button";

export default function Settings() {
  const dispatch = useDispatch();
  const { theme } = useSelector((state: RootState) => state.ui);

  return (
    <VStack align="stretch" gap={5}>
      <Heading>Settings</Heading>
      <Card title="Theme State Example">
        <VStack align="start" gap={3}>
          <Text>Current theme: {theme}</Text>
          <Button
            variant="secondary"
            onClick={() => dispatch(setTheme(theme === "light" ? "dark" : "light"))}
          >
            Toggle Theme
          </Button>
        </VStack>
      </Card>
    </VStack>
  );
}
