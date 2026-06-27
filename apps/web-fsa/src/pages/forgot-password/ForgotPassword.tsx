import { Box, Heading, Text, VStack } from "@chakra-ui/react";

export default function ForgotPassword() {
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
        <Heading size="lg">Forgot Password</Heading>
        <Text color="var(--apple-muted)">
          Connect this page to your password reset endpoint when your backend is ready.
        </Text>
      </VStack>
    </Box>
  );
}
