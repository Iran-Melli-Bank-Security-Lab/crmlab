import type React from "react";
import { Box, Heading } from "@chakra-ui/react";

export default function Card({
  accentColor,
  title,
  children,
}: {
  accentColor?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      position="relative"
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      boxShadow="var(--surface-shadow)"
      overflow="hidden"
      p={{ base: 5, md: 6 }}
      backdropFilter="blur(18px)"
      transition="box-shadow 160ms ease, border-color 160ms ease"
      _hover={{
        borderColor: "var(--apple-border)",
        boxShadow: "var(--surface-shadow-hover)",
      }}
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
