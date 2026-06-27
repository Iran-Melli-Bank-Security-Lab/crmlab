import React from "react";
import { Alert, Box, Code, HStack, VStack } from "@chakra-ui/react";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallbackTitle?: string;
};

function ErrorFallback({
  error,
  fallbackTitle,
  onReset,
}: {
  error?: Error;
  fallbackTitle?: string;
  onReset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <Box maxW="720px" mx="auto" mt={20} p={6}>
      <Alert.Root
        status="error"
        borderRadius="md"
        alignItems="flex-start"
        boxShadow="lg"
      >
        <Alert.Indicator />
        <Alert.Content>
          <VStack align="stretch" gap={4} w="full">
            <Box>
              <Alert.Title fontSize="xl">
                {fallbackTitle || t("errorBoundary.title")}
              </Alert.Title>
              <Alert.Description>{t("errorBoundary.description")}</Alert.Description>
            </Box>
            {error?.message && (
              <Code p={3} borderRadius="md" whiteSpace="pre-wrap">
                {error.message}
              </Code>
            )}
            <HStack flexWrap="wrap">
              <Button onClick={onReset}>{t("errorBoundary.retry")}</Button>
              <Button variant="secondary" onClick={() => window.location.assign("/login")}>
                {t("errorBoundary.login")}
              </Button>
            </HStack>
          </VStack>
        </Alert.Content>
      </Alert.Root>
    </Box>
  );
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("React ErrorBoundary caught an error", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <ErrorFallback
        error={this.state.error}
        fallbackTitle={this.props.fallbackTitle}
        onReset={this.reset}
      />
    );
  }
}
