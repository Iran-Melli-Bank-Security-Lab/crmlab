import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { useLanguage } from "@/features/language/model";

export default function ForgotPassword() {
  const { t } = useLanguage();

  return (
    <Box
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      boxShadow="var(--surface-shadow), 0 10px 28px var(--apple-border-soft)"
      p={{ base: 6, md: 8 }}
    >
      <VStack align="stretch" gap={2}>
        <Heading size="lg">{t("auth.forgot.title")}</Heading>
        <Text color="var(--apple-muted)">
          {t("auth.forgot.description")}
        </Text>
      </VStack>
    </Box>
  );
}
