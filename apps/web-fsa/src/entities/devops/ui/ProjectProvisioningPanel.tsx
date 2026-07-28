import {
  Badge,
  Box,
  Field,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/features/auth/model/useAuth";
import { getApiErrorMessage } from "@/shared/lib/getApiErrorMessage";
import type { Project } from "@/shared/types";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import {
  getProvisioningUiState,
  hasRequiredFailureDetails,
} from "@/entities/project/model/provisioning";
import {
  useConfirmProvisioningReadyMutation,
  useReportProvisioningBlockedMutation,
  useRequestProvisioningRetryMutation,
  useStartProvisioningMutation,
  useSubmitProvisioningResolutionMutation,
} from "../api/devopsApi";

const statusLabels = {
  AWAITING_DEVOPS_SETUP: "Awaiting DevOps setup",
  DEVOPS_IN_PROGRESS: "DevOps setup in progress",
  DEVOPS_READY: "DevOps ready",
  DEVOPS_BLOCKED: "DevOps blocked",
  READY_FOR_DEVOPS_RETRY: "Ready for DevOps retry",
} as const;

export default function ProjectProvisioningPanel({
  project,
  readOnly = false,
  allowRepresentativeResolution = false,
}: {
  project: Project;
  readOnly?: boolean;
  allowRepresentativeResolution?: boolean;
}) {
  const { user, roles } = useAuth();
  const [notes, setNotes] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [technicalDescription, setTechnicalDescription] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [start, startState] = useStartProvisioningMutation();
  const [confirmReady, readyState] = useConfirmProvisioningReadyMutation();
  const [reportBlocked, blockedState] = useReportProvisioningBlockedMutation();
  const [requestRetry, retryState] = useRequestProvisioningRetryMutation();
  const [submitResolution, resolutionState] =
    useSubmitProvisioningResolutionMutation();
  const isAdmin = roles.includes("admin");
  const isAssignedDevops = user?.id === project.devopsAssigneeId;
  const isAssignedRepresentative = user?.id === project.representativeId;
  const ui = getProvisioningUiState({
    status: project.provisioningStatus,
    isAdmin: readOnly ? false : isAdmin,
    isAssignedDevops: readOnly ? false : isAssignedDevops,
    isAssignedRepresentative:
      allowRepresentativeResolution && isAssignedRepresentative,
  });
  const provisioningStatus = ui.status;
  const pending =
    startState.isLoading ||
    readyState.isLoading ||
    blockedState.isLoading ||
    retryState.isLoading ||
    resolutionState.isLoading;
  const blockedDurationMs =
    (project.provisioningBlockedDurationMs || 0) +
    (provisioningStatus === "DEVOPS_BLOCKED" && project.devopsFailureAt
      ? Math.max(0, Date.now() - new Date(project.devopsFailureAt).getTime())
      : 0);

  const run = async (operation: () => Promise<unknown>, message: string) => {
    try {
      await operation();
      toast.success(message);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update provisioning status"));
    }
  };

  const confirmSuccess = () => {
    if (
      !globalThis.confirm(
        "Confirm that the project environment has been configured and tested without errors?"
      )
    ) return;
    void run(
      () => confirmReady({ projectId: project.id, notes: notes.trim() || undefined }).unwrap(),
      "Project environment confirmed ready"
    );
  };

  const submitBlocked = () => {
    if (!hasRequiredFailureDetails(failureReason, technicalDescription)) {
      toast.error("Failure reason and technical description are required");
      return;
    }
    void run(
      () =>
        reportBlocked({
          projectId: project.id,
          failureReason: failureReason.trim(),
          technicalDescription: technicalDescription.trim(),
          recommendedAction: recommendedAction.trim() || undefined,
        }).unwrap(),
      "Setup problem reported to the Lab Representative"
    );
  };

  const submitRepresentativeResolution = () => {
    if (!resolutionMessage.trim()) {
      toast.error("A resolution explanation is required");
      return;
    }
    void run(
      () =>
        submitResolution({
          projectId: project.id,
          resolutionMessage: resolutionMessage.trim(),
        }).unwrap(),
      "Resolution submitted to DevOps"
    );
  };

  return (
    <Box
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      p={{ base: 4, md: 6 }}
    >
      <HStack justify="space-between" align="start" gap={4} flexWrap="wrap">
        <Box>
          <Heading size="md">Environment provisioning</Heading>
          <Text color="var(--apple-muted)" mt={1}>
            Team assignment remains locked until DevOps confirms readiness.
          </Text>
        </Box>
        <Badge
          colorPalette={
            provisioningStatus === "DEVOPS_READY"
              ? "green"
              : provisioningStatus === "DEVOPS_BLOCKED"
                ? "red"
                : provisioningStatus === "READY_FOR_DEVOPS_RETRY"
                  ? "blue"
                : "orange"
          }
          px={3}
          py={1}
          borderRadius="full"
        >
          {statusLabels[provisioningStatus]}
        </Badge>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={5}>
        <Box>
          <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800">ATTEMPT</Text>
          <Text fontWeight="800">{project.provisioningAttemptNumber || 1}</Text>
        </Box>
        <Box>
          <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800">DEADLINE</Text>
          <Text fontWeight="800">{new Date(project.dueDate).toLocaleDateString()}</Text>
        </Box>
        <Box>
          <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800">BLOCKED TIME</Text>
          <Text fontWeight="800">
            {Math.round(blockedDurationMs / 3_600_000)} hours
          </Text>
        </Box>
      </SimpleGrid>

      {(provisioningStatus === "DEVOPS_BLOCKED" ||
        provisioningStatus === "READY_FOR_DEVOPS_RETRY") && (
        <Box mt={5} p={4} bg="var(--apple-danger-bg)" borderRadius="md">
          <Text fontWeight="850">Failure reason</Text>
          <Text mt={1} whiteSpace="pre-wrap">{project.devopsFailureReason}</Text>
          {project.devopsFailureDescription && (
            <Text mt={3} whiteSpace="pre-wrap">{project.devopsFailureDescription}</Text>
          )}
          {project.devopsRecommendedAction && (
            <Text mt={3}><strong>Recommended action:</strong> {project.devopsRecommendedAction}</Text>
          )}
        </Box>
      )}

      {project.devopsResolutionMessage &&
        provisioningStatus === "READY_FOR_DEVOPS_RETRY" && (
          <Box
            mt={5}
            p={4}
            bg="var(--apple-blue-soft)"
            border="1px solid"
            borderColor="var(--apple-blue-border)"
            borderRadius="md"
          >
            <Text fontWeight="850">Lab Representative resolution</Text>
            <Text mt={2} whiteSpace="pre-wrap">
              {project.devopsResolutionMessage}
            </Text>
            <Text color="var(--apple-muted)" fontSize="sm" mt={3}>
              Submitted{" "}
              {project.devopsResolutionSubmittedAt
                ? new Date(project.devopsResolutionSubmittedAt).toLocaleString()
                : ""}
            </Text>
          </Box>
        )}

      {ui.canSubmitResolution && (
        <Box
          mt={5}
          p={4}
          border="1px solid"
          borderColor="var(--apple-border)"
          borderRadius="md"
        >
          <Text fontWeight="850">Report that the rejection issue is resolved</Text>
          <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
            Explain what changed, information received from the client, and why
            DevOps can now attempt setup again.
          </Text>
          <Field.Root mt={4} required>
            <Field.Label>Resolution explanation</Field.Label>
            <Textarea
              value={resolutionMessage}
              onChange={(event) => setResolutionMessage(event.target.value)}
              minH="150px"
              placeholder="Describe what was fixed or changed and why the environment is ready for another DevOps attempt."
            />
          </Field.Root>
          <Button
            mt={4}
            disabled={pending || !resolutionMessage.trim()}
            onClick={submitRepresentativeResolution}
          >
            Submit resolution to DevOps
          </Button>
        </Box>
      )}

      {(ui.canStart || ui.canConfirmReady) &&
        (provisioningStatus === "AWAITING_DEVOPS_SETUP" ||
          provisioningStatus === "DEVOPS_IN_PROGRESS") && (
          <VStack align="stretch" gap={4} mt={5}>
            <Field.Root>
              <Field.Label>DevOps notes (optional)</Field.Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                minH="90px"
              />
            </Field.Root>
            {provisioningStatus === "AWAITING_DEVOPS_SETUP" && (
              <Box
                p={4}
                bg="var(--apple-blue-soft)"
                border="1px solid"
                borderColor="var(--apple-blue-border)"
                borderRadius="md"
              >
                <Text fontWeight="850">Step 1: start environment setup</Text>
                <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
                  After setup starts, the success verification and failure-reason
                  actions will appear here.
                </Text>
                <Button
                  mt={4}
                  disabled={pending}
                  onClick={() =>
                    void run(
                      () => start({ projectId: project.id, notes: notes.trim() || undefined }).unwrap(),
                      "DevOps setup started"
                    )
                  }
                >
                  Start setup
                </Button>
              </Box>
            )}
            {provisioningStatus === "DEVOPS_IN_PROGRESS" && (
              <>
                <Box
                  p={4}
                  bg="var(--apple-surface-subtle)"
                  borderRadius="md"
                >
                  <Text fontWeight="850">Step 2: validate the environment</Text>
                  <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
                    Confirm success when testing passes, or reject the setup and
                    provide the reason that will be sent to the Lab Representative.
                  </Text>
                </Box>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                  <Input
                    label="Failure reason"
                    value={failureReason}
                    onChange={(event) => setFailureReason(event.target.value)}
                  />
                  <Input
                    label="Recommended action (optional)"
                    value={recommendedAction}
                    onChange={(event) => setRecommendedAction(event.target.value)}
                  />
                </SimpleGrid>
                <Field.Root>
                  <Field.Label>Detailed technical description</Field.Label>
                  <Textarea
                    value={technicalDescription}
                    onChange={(event) => setTechnicalDescription(event.target.value)}
                    minH="110px"
                  />
                </Field.Root>
                <HStack justify="end" gap={3} flexWrap="wrap">
                  <Button variant="secondary" disabled={pending} onClick={submitBlocked}>
                    Reject setup / report failure
                  </Button>
                  <Button disabled={pending} onClick={confirmSuccess}>
                    Confirm successful setup
                  </Button>
                </HStack>
              </>
            )}
          </VStack>
        )}

      {ui.canRetry && (
        <Box
          mt={5}
          p={4}
          border="1px solid"
          borderColor="var(--apple-blue-border)"
          borderRadius="md"
        >
          <Text fontWeight="850">Resolution ready for review</Text>
          <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
            Review the representative’s explanation above, then begin the next
            DevOps setup attempt.
          </Text>
          <Button
            mt={4}
            disabled={pending}
            onClick={() =>
              void run(
                () =>
                  requestRetry({
                    projectId: project.id,
                    notes: "Resolution reviewed; starting another DevOps setup attempt.",
                  }).unwrap(),
                "New DevOps setup attempt started"
              )
            }
          >
            Review complete — retry setup
          </Button>
        </Box>
      )}

      {!readOnly && provisioningStatus !== "DEVOPS_READY" &&
        !ui.canStart &&
        !ui.canConfirmReady &&
        !ui.canRetry && (
          <Text mt={5} color="var(--apple-warning-text)" fontWeight="750">
            Team assignment is disabled while the environment is awaiting DevOps confirmation.
          </Text>
        )}

      {project.provisioningHistory?.length ? (
        <Box mt={6}>
          <Text fontWeight="850" mb={2}>Provisioning history</Text>
          <VStack align="stretch" gap={2}>
            {[...project.provisioningHistory].reverse().map((entry, index) => (
              <Box key={`${entry.timestamp}-${index}`} p={3} bg="var(--apple-surface-subtle)" borderRadius="md">
                <Text fontWeight="750">
                  {entry.previousStatus} → {entry.newStatus}
                </Text>
                <Text color="var(--apple-muted)" fontSize="sm">
                  Attempt {entry.attemptNumber} · {new Date(entry.timestamp).toLocaleString()}
                </Text>
                {entry.failureReason && (
                  <Text mt={1} fontSize="sm">Failure: {entry.failureReason}</Text>
                )}
                {entry.resolutionMessage && (
                  <Text mt={1} fontSize="sm" whiteSpace="pre-wrap">
                    Resolution: {entry.resolutionMessage}
                  </Text>
                )}
              </Box>
            ))}
          </VStack>
        </Box>
      ) : null}
    </Box>
  );
}
