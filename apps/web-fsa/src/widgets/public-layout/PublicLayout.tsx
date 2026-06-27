import { Outlet, Link } from "react-router-dom";
import { Box, Container, HStack, Link as ChakraLink } from "@chakra-ui/react";
import { ThemeIconButton } from "@/features/theme/ui/ThemeToggle";
import LanguageSwitcher from "@/features/language/ui/LanguageSwitcher";
import { useLanguage } from "@/features/language/model";

export default function PublicLayout() {
  const { t } = useLanguage();

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
          <Link to="/login">{t("auth.login.title")}</Link>
        </ChakraLink>
        <ChakraLink asChild>
          <Link to="/signup">{t("auth.signup.submit")}</Link>
        </ChakraLink>
        <ChakraLink asChild>
          <Link to="/forgot-password">{t("auth.forgot.title")}</Link>
        </ChakraLink>
        <LanguageSwitcher />
        <ThemeIconButton />
      </HStack>
      <Container maxW="xl">
        <Outlet />
      </Container>
    </Box>
  );
}
