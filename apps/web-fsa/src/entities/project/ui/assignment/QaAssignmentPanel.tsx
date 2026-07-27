import { Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useAssignProjectUsersMutation,
  useGetProjectAssigneesQuery,
} from "@/entities/project/api/projectsApi";
import { getApiErrorMessage } from "@/shared/lib/getApiErrorMessage";
import type { Project, User } from "@/shared/types";
import Button from "@/shared/ui/primitives/Button";

function name(user: User) {
  return user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.id;
}

export default function QaAssignmentPanel({ project }: { project: Project }) {
  const { data: users = [], isLoading } = useGetProjectAssigneesQuery({
    projectId: project.id,
    role: "qa",
  });
  const initial = useMemo(
    () => users.filter((user) => project.assignedUserIds?.includes(user.id)).map((user) => user.id),
    [project.assignedUserIds, users]
  );
  const [selection, setSelection] = useState<string[] | null>(null);
  const selected = selection || initial;
  const [assign, assignState] = useAssignProjectUsersMutation();

  const save = async () => {
    try {
      await assign({ projectId: project.id, userIds: selected, role: "qa" }).unwrap();
      toast.success("QA team assignment saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not assign QA users"));
    }
  };

  return (
    <Box border="1px solid" borderColor="var(--apple-border)" borderRadius="md" p={5}>
      <Heading size="md">QA team assignment</Heading>
      <Text color="var(--apple-muted)" mt={1}>
        Assign QA users now that the DevOps environment is ready.
      </Text>
      {isLoading ? (
        <Text mt={4}>Loading eligible QA users…</Text>
      ) : (
        <VStack align="stretch" gap={4} mt={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {users.map((user) => {
              const active = selected.includes(user.id);
              return (
                <Button
                  key={user.id}
                  variant={active ? "primary" : "secondary"}
                  onClick={() =>
                    setSelection(
                      active
                        ? selected.filter((id) => id !== user.id)
                        : [...selected, user.id]
                    )
                  }
                >
                  {name(user)}
                </Button>
              );
            })}
          </SimpleGrid>
          {!users.length && <Text color="var(--apple-muted)">No eligible QA users found.</Text>}
          <Button
            alignSelf="end"
            disabled={assignState.isLoading || JSON.stringify(selected) === JSON.stringify(initial)}
            onClick={save}
          >
            Save QA assignment
          </Button>
        </VStack>
      )}
    </Box>
  );
}
