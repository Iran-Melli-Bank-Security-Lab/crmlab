import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { useLanguage } from "@/features/language/model";

export default function Unauthorized() {
  const { t } = useLanguage();

  return (
    <Box
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      boxShadow="var(--surface-shadow), 0 10px 28px var(--apple-border-soft)"
      p={8}
    >
      <VStack gap={2}>
        <Heading>{t("unauthorized.title")}</Heading>
        <Text color="var(--apple-muted)">{t("unauthorized.description")}</Text>
      </VStack>
    </Box>
  );
}
