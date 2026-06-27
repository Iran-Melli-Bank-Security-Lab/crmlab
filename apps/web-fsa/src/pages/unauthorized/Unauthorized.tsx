import { Box, Heading, Text, VStack } from "@chakra-ui/react";

export default function Unauthorized() {
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
        <Heading>403 Unauthorized</Heading>
        <Text color="var(--apple-muted)">You do not have permission to access this page.</Text>
      </VStack>
    </Box>
  );
}
