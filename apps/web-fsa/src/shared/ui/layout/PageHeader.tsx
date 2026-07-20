import type { ReactNode } from "react";
import { Badge, Box, Heading, HStack, Text } from "@chakra-ui/react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <HStack
      as="header"
      align="end"
      justify="space-between"
      gap={4}
      flexWrap="wrap"
      minW={0}
    >
      <Box minW={0} maxW="780px">
        {eyebrow && (
          <Badge
            bg="var(--apple-blue-soft)"
            color="var(--apple-blue)"
            borderRadius="full"
            px={3}
            py={1}
            mb={2}
            fontSize="xs"
            fontWeight="800"
            textTransform="none"
          >
            {eyebrow}
          </Badge>
        )}
        <Heading
          as="h1"
          color="var(--apple-text)"
          fontSize={{ base: "2xl", md: "3xl" }}
          fontWeight="800"
          letterSpacing="0"
          lineHeight="1.15"
        >
          {title}
        </Heading>
        {description && (
          <Text color="var(--apple-muted)" mt={2} fontSize="sm" lineHeight="1.7">
            {description}
          </Text>
        )}
      </Box>
      {(actions || meta) && (
        <HStack gap={3} flexWrap="wrap" justify="end">
          {meta}
          {actions}
        </HStack>
      )}
    </HStack>
  );
}
