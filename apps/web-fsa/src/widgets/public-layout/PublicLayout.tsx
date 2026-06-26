import { Outlet, Link } from "react-router-dom";
import { Box, Container, HStack, Link as ChakraLink } from "@chakra-ui/react";
import { ThemeIconButton } from "@/features/theme/ui/ThemeToggle";

export default function PublicLayout() {
  return (
    <Box minH="100vh" bg="var(--apple-bg)" py={8} px={4}>
      <HStack
        as="nav"
        justify="center"
        gap={6}
        mb={8}
        color="var(--apple-muted)"
        fontWeight="700"
      >
        <ChakraLink asChild>
          <Link to="/login">Login</Link>
        </ChakraLink>
        <ChakraLink asChild>
          <Link to="/signup">Signup</Link>
        </ChakraLink>
        <ChakraLink asChild>
          <Link to="/forgot-password">Forgot Password</Link>
        </ChakraLink>
        <ThemeIconButton />
      </HStack>
      <Container maxW="xl">
        <Outlet />
      </Container>
    </Box>
  );
}
