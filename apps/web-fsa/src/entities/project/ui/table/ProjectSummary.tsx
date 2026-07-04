import { Text, VStack } from "@chakra-ui/react";
import type { ProjectTableRow } from "./types";

export default function ProjectSummary({ project }: { project: ProjectTableRow }) {
  return (
    <VStack align="start" gap={1} minW={0} width="full">
      <Text
        fontWeight="850"
        color="var(--apple-text)"
        maxW="full"
        truncate
        title={project.name}
      >
        {project.name || "—"}
      </Text>
      <Text
        color="var(--apple-muted)"
        fontSize="sm"
        fontWeight="600"
        maxW="full"
        truncate
        title={project.client}
      >
        {project.client || "—"}
      </Text>
    </VStack>
  );
}
