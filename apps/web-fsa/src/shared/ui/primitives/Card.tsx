import type React from "react";
import { Box, Heading } from "@chakra-ui/react";

export default function Card({
  accentColor,
  title,
  children,
  interactive = false,
}: {
  accentColor?: string;
  title?: string;
  children: React.ReactNode;
  interactive?: boolean;
}) {
  return (
    <Box
      position="relative"
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border-soft)"
      borderRadius="md"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04)"
      overflow="hidden"
      p={{ base: 5, md: 6 }}
      transition={interactive ? "box-shadow 160ms ease, border-color 160ms ease" : undefined}
      _hover={
        interactive
          ? {
              borderColor: "var(--apple-blue-border)",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.07)",
            }
          : undefined
      }
    >
      {accentColor && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="2px"
          bg={accentColor}
          opacity={0.9}
        />
      )}
      {title && (
        <Heading
          as="h2"
          size="sm"
          mb={4}
          color="var(--apple-text)"
          fontWeight="850"
          letterSpacing="0"
          lineHeight="1.25"
        >
          {title}
        </Heading>
      )}
      {children}
    </Box>
  );
}
