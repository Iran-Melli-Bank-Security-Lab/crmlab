import { Box, Text, VStack } from "@chakra-ui/react";

export default function EmptyState({
  title = "No data yet",
  description = "There is nothing to show here.",
}) {
  return (
    <Box
      border="1px dashed"
      borderColor="var(--apple-border)"
      borderRadius="md"
      p={8}
      textAlign="center"
      bg="var(--apple-surface-subtle)"
    >
      <VStack gap={2}>
        <Text fontWeight="800" fontSize="lg">
          {title}
        </Text>
        <Text color="var(--apple-muted)">{description}</Text>
      </VStack>
    </Box>
  );
}
