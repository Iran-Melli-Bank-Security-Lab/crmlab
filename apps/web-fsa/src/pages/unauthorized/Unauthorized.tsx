import { Box, Heading, Text, VStack } from "@chakra-ui/react";

export default function Unauthorized() {
  return (
    <Box
      bg="rgba(255, 255, 255, 0.92)"
      border="1px solid"
      borderColor="rgba(0, 0, 0, 0.12)"
      borderRadius="md"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04), 0 10px 28px rgba(0, 0, 0, 0.06)"
      p={8}
    >
      <VStack gap={2}>
        <Heading>403 Unauthorized</Heading>
        <Text color="#6e6e73">You do not have permission to access this page.</Text>
      </VStack>
    </Box>
  );
}
