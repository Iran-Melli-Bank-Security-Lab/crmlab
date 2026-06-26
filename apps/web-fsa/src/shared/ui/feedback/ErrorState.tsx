import { Alert, Box } from "@chakra-ui/react";
import { getApiErrorMessage } from "@/shared/lib/getApiErrorMessage";

export default function ErrorState({ error, title = "Request failed" }) {
  return (
    <Alert.Root status="error" borderRadius="md" alignItems="flex-start">
      <Alert.Indicator />
      <Alert.Content>
        <Box>
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description>{getApiErrorMessage(error)}</Alert.Description>
        </Box>
      </Alert.Content>
    </Alert.Root>
  );
}
