import { Box, Heading, Text, VStack } from "@chakra-ui/react";

export default function ForgotPassword() {
  return (
    <Box
      bg="rgba(255, 255, 255, 0.92)"
      border="1px solid"
      borderColor="rgba(0, 0, 0, 0.12)"
      borderRadius="md"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04), 0 10px 28px rgba(0, 0, 0, 0.06)"
      p={{ base: 6, md: 8 }}
    >
      <VStack align="stretch" gap={2}>
        <Heading size="lg">Forgot Password</Heading>
        <Text color="#6e6e73">
          Connect this page to your password reset endpoint when your backend is ready.
        </Text>
      </VStack>
    </Box>
  );
}
