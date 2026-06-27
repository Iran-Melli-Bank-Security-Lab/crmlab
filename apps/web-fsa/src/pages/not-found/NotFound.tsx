import { Link } from "react-router-dom";
import { Box, Heading, Link as ChakraLink, Text, VStack } from "@chakra-ui/react";
import { useLanguage } from "@/features/language/model";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <Box
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      boxShadow="var(--surface-shadow), 0 10px 28px var(--apple-border-soft)"
      p={8}
      textAlign="center"
    >
      <VStack gap={3}>
        <Heading>{t("notFound.title")}</Heading>
        <Text color="var(--apple-muted)">{t("notFound.description")}</Text>
        <ChakraLink asChild color="var(--apple-blue)" fontWeight="700">
          <Link to="/login">{t("notFound.login")}</Link>
        </ChakraLink>
      </VStack>
    </Box>
  );
}
