import { Link } from "react-router-dom";
import { Box, Heading, Link as ChakraLink, Text, VStack } from "@chakra-ui/react";

export default function NotFound() {
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
        <Heading>404 Not Found</Heading>
        <Text color="var(--apple-muted)">This page does not exist.</Text>
        <ChakraLink asChild color="var(--apple-blue)" fontWeight="700">
          <Link to="/login">Go to login</Link>
        </ChakraLink>
      </VStack>
    </Box>
  );
}
