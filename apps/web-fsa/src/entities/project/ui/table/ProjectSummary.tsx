import { Text, VStack } from "@chakra-ui/react";
import type { ProjectTableRow } from "./types";

export default function ProjectSummary({ project }: { project: ProjectTableRow }) {
  return (
    <VStack align="start" gap={0.5} minW={0} width="full">
      <Text
        fontWeight="800"
        color="var(--apple-text)"
        maxW="full"
        truncate
        title={project.name}
      >
        {project.name || "—"}
      </Text>
      <Text
        color="var(--apple-muted)"
        fontSize="xs"
        fontWeight="650"
        maxW="full"
        truncate
        title={project.client}
      >
        {project.client || "—"}
      </Text>
    </VStack>
  );
}
