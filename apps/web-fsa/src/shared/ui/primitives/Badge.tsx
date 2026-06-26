import type React from "react";
import { Badge as ChakraBadge } from "@chakra-ui/react";

export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <ChakraBadge
      bg="var(--apple-surface-subtle)"
      color="var(--apple-text)"
      border="1px solid"
      borderColor="var(--apple-border-soft)"
      borderRadius="full"
      px={3}
      py={1}
      fontSize="11px"
      fontWeight="800"
      letterSpacing="0"
      textTransform="none"
    >
      {children}
    </ChakraBadge>
  );
}
