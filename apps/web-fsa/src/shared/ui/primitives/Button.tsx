import type React from "react";
import {
  Button as ChakraButton,
  type ButtonProps as ChakraButtonProps,
} from "@chakra-ui/react";

type AppButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = Omit<ChakraButtonProps, "variant" | "loading"> & {
  variant?: AppButtonVariant;
  isLoading?: boolean;
  children: React.ReactNode;
};

function getVariantProps(variant: AppButtonVariant): Partial<ChakraButtonProps> {
  switch (variant) {
    case "secondary":
      return {
        bg: "var(--apple-surface)",
        color: "var(--apple-text)",
        border: "1px solid",
        borderColor: "var(--apple-border)",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
        _hover: { bg: "var(--apple-surface-subtle)", borderColor: "var(--apple-border)" },
      };
    case "danger":
      return {
        bg: "#ca3521",
        color: "white",
        _hover: { bg: "#ae2e24" },
      };
    case "ghost":
      return {
        bg: "transparent",
        color: "var(--apple-secondary)",
        _hover: { bg: "var(--apple-blue-soft)", color: "var(--apple-blue)" },
      };
    case "primary":
    default:
      return {
        bg: "var(--apple-blue)",
        color: "white",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
        _hover: {
          bg: "var(--apple-blue-hover)",
          boxShadow: "0 6px 18px rgba(0, 113, 227, 0.22)",
        },
      };
  }
}

export default function Button({
  children,
  variant = "primary",
  isLoading,
  ...props
}: ButtonProps) {
  return (
    <ChakraButton
      size="sm"
      minH="36px"
      borderRadius="md"
      fontWeight="800"
      letterSpacing="0"
      loading={isLoading}
      transition="background 140ms ease, box-shadow 140ms ease, border-color 140ms ease"
      _focusVisible={{ boxShadow: "var(--focus-ring)" }}
      {...getVariantProps(variant)}
      {...props}
    >
      {children}
    </ChakraButton>
  );
}
