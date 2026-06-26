import { Center, HStack, Spinner, Text } from "@chakra-ui/react";

export default function LoadingScreen({ text = "Loading..." }) {
  return (
    <Center
      bg="rgba(255, 255, 255, 0.92)"
      border="1px solid"
      borderColor="rgba(0, 0, 0, 0.12)"
      borderRadius="md"
      p={8}
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04)"
    >
      <HStack>
        <Spinner />
        <Text fontWeight="700">{text}</Text>
      </HStack>
    </Center>
  );
}
