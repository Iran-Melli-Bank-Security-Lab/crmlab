import React from "react";
import { Alert, Box, Code, HStack, VStack } from "@chakra-ui/react";
import Button from "@/shared/ui/primitives/Button";

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallbackTitle?: string;
};

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
                  {this.props.fallbackTitle || "Something went wrong"}
                </Alert.Title>
                <Alert.Description>
                  The page crashed safely instead of breaking the whole app.
                </Alert.Description>
              </Box>
              {this.state.error?.message && (
                <Code p={3} borderRadius="md" whiteSpace="pre-wrap">
                  {this.state.error.message}
                </Code>
              )}
              <HStack flexWrap="wrap">
                <Button onClick={this.reset}>Try again</Button>
                <Button
                  variant="secondary"
                  onClick={() => window.location.assign("/login")}
                >
                  Go to login
                </Button>
              </HStack>
            </VStack>
          </Alert.Content>
        </Alert.Root>
      </Box>
    );
  }
}
