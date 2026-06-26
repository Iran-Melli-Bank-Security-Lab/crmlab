import { Text, VStack } from "@chakra-ui/react";
import type { ProjectTableRow } from "./types";

export default function ProjectSummary({ project }: { project: ProjectTableRow }) {
  return (
    <VStack align="start" gap={1} minW="220px">
      <Text fontWeight="850" color="#1d1d1f">
        {project.name}
      </Text>
      <Text color="#6e6e73" fontSize="sm" fontWeight="600">
        {project.client}
      </Text>
    </VStack>
  );
}
