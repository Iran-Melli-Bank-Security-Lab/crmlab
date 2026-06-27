import { Center, HStack, Spinner, Text } from "@chakra-ui/react";

export default function LoadingScreen({ text = "Loading..." }) {
  return (
    <Center
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      p={8}
      boxShadow="var(--surface-shadow)"
    >
      <HStack>
        <Spinner />
        <Text fontWeight="700">{text}</Text>
      </HStack>
    </Center>
  );
}
