import { Link } from "react-router-dom";
import { Box, Heading, Link as ChakraLink, Text, VStack } from "@chakra-ui/react";

export default function NotFound() {
  return (
    <Box
      bg="rgba(255, 255, 255, 0.92)"
      border="1px solid"
      borderColor="rgba(0, 0, 0, 0.12)"
      borderRadius="md"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04), 0 10px 28px rgba(0, 0, 0, 0.06)"
      p={8}
      textAlign="center"
    >
      <VStack gap={3}>
        <Heading>404 Not Found</Heading>
        <Text color="#6e6e73">This page does not exist.</Text>
        <ChakraLink asChild color="#0071e3" fontWeight="700">
          <Link to="/login">Go to login</Link>
        </ChakraLink>
      </VStack>
    </Box>
  );
}
