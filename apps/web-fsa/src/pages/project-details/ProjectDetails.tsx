import { Badge, Box, Heading, HStack, NativeSelect, SimpleGrid, Text, Textarea, VStack } from "@chakra-ui/react";
import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { PERMISSIONS } from "@/entities/permission/model/permissions";
import { useLanguage } from "@/features/language/model";
import {
  useGetProjectBugVisibilitySettingsQuery,
  useGetProjectQuery,
  useCloseProjectMutation,
  useCreateDeadlineExtensionRequestMutation,
  useGetDeadlineExtensionRequestsQuery,
  useReviewDeadlineExtensionRequestMutation,
  useUpdateProjectDeadlineSettingsMutation,
  useUpdateProjectBugVisibilitySettingsMutation,
} from "@/entities/project/api/projectsApi";
import { formatCompactGroupId, formatDate } from "@/entities/project/ui/table/formatters";
import { usePermission } from "@/features/access-control/model/usePermission";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import { getApiErrorMessage } from "@/shared/lib/getApiErrorMessage";
import type { Project, ProjectDiscipline, ProjectStatus } from "@/shared/types";
import ProjectProvisioningPanel from "@/entities/devops/ui/ProjectProvisioningPanel";
import QaAssignmentPanel from "@/entities/project/ui/assignment/QaAssignmentPanel";

const statusStyles: Record<ProjectStatus, { bg: string; color: string; border: string }> = {
  new: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    border: "var(--apple-blue-border)",
  },
  in_progress: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    border: "var(--apple-blue-border)",
  },
  pending: {
    bg: "var(--apple-warning-bg)",
    color: "var(--apple-warning-text)",
    border: "var(--apple-warning-border)",
  },
  planning: {
    bg: "var(--apple-surface-hover)",
    color: "var(--apple-secondary)",
    border: "var(--apple-border-soft)",
  },
  active: {
    bg: "var(--apple-blue-soft)",
    color: "var(--apple-blue)",
    border: "var(--apple-blue-border)",
  },
  blocked: {
    bg: "var(--apple-danger-bg)",
    color: "var(--apple-danger-text)",
    border: "var(--apple-danger-border)",
  },
  review: {
    bg: "var(--apple-warning-bg)",
    color: "var(--apple-warning-text)",
    border: "var(--apple-warning-border)",
  },
  completed: {
    bg: "var(--apple-success-bg)",
    color: "var(--apple-success-text)",
    border: "var(--apple-success-border)",
  },
};

const disciplineLabels: Record<ProjectDiscipline, string> = {
  security: "Security",
  quality: "Quality",
  devops: "DevOps",
  platform: "Platform",
};

const platformLabels: Record<string, string> = {
  web: "Web",
  mobile: "Mobile",
  desktop: "Desktop",
};

function formatProjectPlatform(platform?: string) {
  if (!platform) return "No platform";
  return platformLabels[platform.toLowerCase()] || platform;
}

function DetailPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box
      bg="var(--apple-surface-raised)"
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="md"
      boxShadow="var(--surface-shadow)"
      p={{ base: 5, md: 6 }}
      backdropFilter="blur(18px)"
    >
      <Heading as="h2" size="sm" color="var(--apple-text)" fontWeight="850" mb={4}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

function DetailItem({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <Box minW={0}>
      <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800" textTransform="uppercase">
        {label}
      </Text>
      <Text color="var(--apple-text)" fontSize="sm" fontWeight="750" mt={1} wordBreak="break-word">
        {value || "-"}
      </Text>
    </Box>
  );
}

function AdminBugVisibilitySettings({ projectId }: { projectId: string }) {
  const { data, isLoading } = useGetProjectBugVisibilitySettingsQuery(projectId);
  const [updateSettings, updateResult] = useUpdateProjectBugVisibilitySettingsMutation();
  const [enabled, setEnabled] = useState(true);
  const [requiredHours, setRequiredHours] = useState("30");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setEnabled(data.timeRequirementEnabled);
    setRequiredHours(String(data.requiredHours));
    setOverrides(Object.fromEntries(
      data.userOverrides.map((override) => [override.userId, String(override.requiredHours)])
    ));
  }, [data]);

  const save = async () => {
    const hours = Number(requiredHours);
    if (!Number.isFinite(hours) || hours < 0) {
      toast.error("Required hours must be zero or greater");
      return;
    }
    try {
      await updateSettings({
        projectId,
        settings: {
          timeRequirementEnabled: enabled,
          requiredHours: hours,
          userOverrides: Object.entries(overrides).flatMap(([userId, value]) => {
            if (value.trim() === "") return [];
            const overrideHours = Number(value);
            return Number.isFinite(overrideHours) && overrideHours >= 0
              ? [{ userId, requiredHours: overrideHours }]
              : [];
          }),
        },
      }).unwrap();
      toast.success("Pentester bug visibility settings saved");
    } catch {
      toast.error("Could not save bug visibility settings");
    }
  };

  return (
    <DetailPanel title="Pentester bug visibility">
      <Text color="var(--apple-muted)" fontSize="sm" mb={4}>
        Pentesters always see their own findings. Verified findings from other users
        are unlocked after the configured work time.
      </Text>
      {isLoading ? (
        <Text color="var(--apple-muted)">Loading settings...</Text>
      ) : (
        <VStack align="stretch" gap={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Box>
              <Text fontSize="sm" fontWeight="800" mb={2}>Time requirement</Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={enabled ? "enabled" : "disabled"}
                  onChange={(event) => setEnabled(event.target.value === "enabled")}
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="800" mb={2}>Default required hours</Text>
              <Input
                type="number"
                min="0"
                max="10000"
                step="0.5"
                value={requiredHours}
                disabled={!enabled}
                onChange={(event) => setRequiredHours(event.target.value)}
              />
            </Box>
          </SimpleGrid>

          {data?.eligiblePentesters.length ? (
            <Box>
              <Text fontSize="sm" fontWeight="800" mb={2}>Per-user overrides</Text>
              <VStack align="stretch" gap={2}>
                {data.eligiblePentesters.map((user) => (
                  <HStack key={user.userId} gap={3} flexWrap="wrap">
                    <Box flex="1" minW="220px">
                      <Text fontWeight="750">{user.name}</Text>
                      {user.username && (
                        <Text color="var(--apple-muted)" fontSize="xs">@{user.username}</Text>
                      )}
                    </Box>
                    <Input
                      type="number"
                      min="0"
                      max="10000"
                      step="0.5"
                      width="180px"
                      placeholder="Use project default"
                      value={overrides[user.userId] || ""}
                      disabled={!enabled}
                      onChange={(event) => setOverrides((current) => ({
                        ...current,
                        [user.userId]: event.target.value,
                      }))}
                    />
                  </HStack>
                ))}
              </VStack>
            </Box>
          ) : null}
          <Button alignSelf="start" onClick={save} isLoading={updateResult.isLoading}>
            Save visibility settings
          </Button>
        </VStack>
      )}
    </DetailPanel>
  );
}

function DeadlineManagement({ project, isAdmin }: { project: Project; isAdmin: boolean }) {
  const { t } = useLanguage();
  const { data: requests = [], isLoading } = useGetDeadlineExtensionRequestsQuery(project.id);
  const [updateSettings, settingsState] = useUpdateProjectDeadlineSettingsMutation();
  const [createRequest, createState] = useCreateDeadlineExtensionRequestMutation();
  const [reviewRequest, reviewState] = useReviewDeadlineExtensionRequestMutation();
  const [message, setMessage] = useState("");
  const [requestType, setRequestType] = useState<"individual" | "project">("individual");
  const [requestedDeadline, setRequestedDeadline] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const responsibilities = project.responsibilityContext?.responsibilityKeys || project.myResponsibilities || [];
  const isTechnicalManager = responsibilities.includes("security_manager") ||
    responsibilities.includes("quality_manager");
  const canRequestExtension = isTechnicalManager ||
    responsibilities.includes("pentester") ||
    responsibilities.includes("qa");
  const effectiveRequestType = isTechnicalManager ? "project" : requestType;
  const hasPendingRequest = requests.some((request) =>
    request.isOwn &&
    request.requestType === effectiveRequestType &&
    ["pending", "pending_technical_review", "pending_admin_review"].includes(request.status)
  );
  const canCreateRequest = canRequestExtension &&
    !project.deadlinePassed && project.status !== "completed";

  const toggleDeadline = async () => {
    try {
      await updateSettings({
        projectId: project.id,
        deadlineEnabled: project.deadlineEnabled === false,
      }).unwrap();
      toast.success(project.deadlineEnabled === false ? "Deadline enabled" : "Deadline disabled");
    } catch {
      toast.error("Unable to update deadline enforcement");
    }
  };

  const submitRequest = async () => {
    if (!requestedDeadline) {
      toast.error("Select the requested extension deadline");
      return;
    }
    try {
      await createRequest({
        projectId: project.id,
        requestType: effectiveRequestType,
        requestedDeadline: new Date(requestedDeadline).toISOString(),
        message: message.trim() || undefined,
      }).unwrap();
      setMessage("");
      setRequestedDeadline("");
      toast.success("Deadline extension request sent");
    } catch (error) {
      const apiMessage = getApiErrorMessage(error, "");
      toast.error(
        apiMessage === "Deadline extension requests must be created before the project expires"
          ? t("project.deadlineExtension.expiredError")
          : apiMessage || t("project.deadlineExtension.requestError"),
        { position: "top-center" }
      );
    }
  };

  const review = async (
    requestId: string,
    action: "approve" | "reject" | "forward"
  ) => {
    try {
      await reviewRequest({
        projectId: project.id,
        requestId,
        action,
        reviewNote: reviewNotes[requestId]?.trim() || undefined,
      }).unwrap();
      toast.success(`Request ${action === "forward" ? "forwarded" : `${action}d`}`);
    } catch {
      toast.error("Unable to review deadline request");
    }
  };

  return (
    <DetailPanel title="Deadline management">
      <HStack justify="space-between" gap={4} flexWrap="wrap">
        <Box>
          <Text fontWeight="850">
            Deadline enforcement: {project.deadlineEnabled === false ? "Disabled" : "Enabled"}
          </Text>
          <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
            Stored deadline: {formatDate(project.testExpiresAt || project.dueDate)}
          </Text>
        </Box>
        {isAdmin && (
          <Button variant="secondary" onClick={toggleDeadline} isLoading={settingsState.isLoading}>
            {project.deadlineEnabled === false ? "Enable Deadline" : "Disable Deadline"}
          </Button>
        )}
      </HStack>

      {!isAdmin && canRequestExtension && (
        <Box mt={5} pt={5} borderTop="1px solid" borderColor="var(--apple-border-soft)">
          <Text fontWeight="850">Request a deadline extension</Text>
          {!canCreateRequest ? (
            <Text mt={2} color="var(--apple-warning-text)" fontSize="sm">
              {t("project.deadlineExtension.unavailableError")}
            </Text>
          ) : (
            <VStack align="stretch" gap={3} mt={3}>
              {!isTechnicalManager && (
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={requestType}
                    onChange={(event) => setRequestType(event.target.value as "individual" | "project")}
                  >
                    <option value="individual">Individual extension</option>
                    <option value="project">Whole-project extension</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              )}
              <Input
                type="datetime-local"
                value={requestedDeadline}
                onChange={(event) => setRequestedDeadline(event.target.value)}
              />
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Optional reason or message"
                maxLength={2000}
              />
              <Button
                alignSelf="start"
                onClick={submitRequest}
                isLoading={createState.isLoading}
                disabled={hasPendingRequest}
              >
                {hasPendingRequest ? "Request pending" : "Send extension request"}
              </Button>
            </VStack>
          )}
        </Box>
      )}

      <VStack align="stretch" gap={3} mt={requests.length || isLoading ? 5 : 0}>
        {isLoading && <Text color="var(--apple-muted)">Loading requests…</Text>}
        {requests.map((request) => (
          <Box key={request.id} p={4} border="1px solid" borderColor="var(--apple-border-soft)" borderRadius="md">
            <HStack justify="space-between" gap={3} flexWrap="wrap">
              <Box>
                <Text fontWeight="850">{request.requester?.name || "My request"}</Text>
                <Text fontSize="xs" color="var(--apple-muted)">
                  {new Date(request.requestedAt).toLocaleString()} · {request.requestType} · {request.status}
                </Text>
              </Box>
              <Badge>{request.status}</Badge>
            </HStack>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} mt={3}>
              <DetailItem label="Current deadline" value={formatDate(request.currentDeadline)} />
              <DetailItem label="Requested deadline" value={formatDate(request.requestedDeadline)} />
            </SimpleGrid>
            {request.message && <Text mt={3} whiteSpace="pre-wrap">{request.message}</Text>}
            {request.technicalReviewNote && <Text mt={2}>Technical review: {request.technicalReviewNote}</Text>}
            {request.adminReviewNote && <Text mt={2}>Admin review: {request.adminReviewNote}</Text>}
            {request.actions?.length ? (
              <VStack align="stretch" gap={3} mt={4}>
                <Textarea
                  value={reviewNotes[request.id] || ""}
                  onChange={(event) => setReviewNotes((current) => ({
                    ...current,
                    [request.id]: event.target.value,
                  }))}
                  placeholder="Optional review note"
                  maxLength={2000}
                />
                <HStack gap={2} flexWrap="wrap">
                  {request.actions.map((action) => (
                    <Button
                      key={action}
                      variant={action === "reject" ? "secondary" : "primary"}
                      onClick={() => review(request.id, action)}
                      isLoading={reviewState.isLoading}
                    >
                      {action === "forward" ? "Recommend to Lab Admin" : action}
                    </Button>
                  ))}
                </HStack>
              </VStack>
            ) : null}
          </Box>
        ))}
      </VStack>
    </DetailPanel>
  );
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const style = statusStyles[status];
  return (
    <Badge
      bg={style.bg}
      color={style.color}
      border="1px solid"
      borderColor={style.border}
      borderRadius="full"
      px={3}
      py={1}
      textTransform="capitalize"
      fontWeight="850"
    >
      {status.replace("_", " ")}
    </Badge>
  );
}

function metricItems(project: Project) {
  return [
    { label: "Progress", value: `${project.progress}%` },
    { label: "Risk score", value: project.riskScore },
    { label: "Findings", value: project.vulnerabilities },
    { label: "Test coverage", value: `${project.testCoverage}%` },
    { label: "Open bugs", value: project.openBugs },
    { label: "Last activity", value: formatDate(project.lastActivity) },
  ];
}

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { hasPermission } = usePermission();
  const {
    data: project,
    error,
    isLoading,
  } = useGetProjectQuery(projectId, {
    skip: !projectId,
  });
  const [closeProject, closeResult] = useCloseProjectMutation();
  const canOpenPentestWorkspace =
    Boolean(project) &&
    project.discipline === "security" &&
    project.status !== "completed" &&
    hasPermission(PERMISSIONS.PENTEST_PROJECTS_READ);
  const isAdmin = hasPermission(PERMISSIONS.ADMIN_SYSTEM_MANAGE);

  if (isLoading) {
    return <LoadingScreen text="Loading project..." />;
  }

  if (error) {
    return <ErrorState title="Project unavailable" error={error} />;
  }

  if (!project) {
    return <ErrorState title="Project unavailable" error={{ data: { message: "Project not found" } }} />;
  }

  const manuallyCloseProject = async () => {
    if (!window.confirm("Close this project now? Users will no longer be able to work or submit bugs.")) {
      return;
    }
    try {
      await closeProject(project.id).unwrap();
      toast.success("Project closed");
    } catch {
      toast.error("Unable to close project");
    }
  };

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" align="start" gap={4} flexWrap="wrap">
        <Box minW={0}>
          <HStack gap={2} flexWrap="wrap" mb={3}>
            <Badge
              bg="var(--apple-blue-soft)"
              color="var(--apple-blue)"
              border="1px solid"
              borderColor="var(--apple-blue-border)"
              borderRadius="full"
              px={3}
              py={1}
              textTransform="none"
              fontWeight="850"
            >
              {disciplineLabels[project.discipline]}
            </Badge>
            <ProjectStatusBadge status={project.status} />
          </HStack>
          <Heading
            color="var(--apple-text)"
            fontSize={{ base: "2xl", md: "3xl" }}
            fontWeight="850"
            letterSpacing="0"
            lineHeight="1.12"
          >
            {project.name}
          </Heading>
          <Text color="var(--apple-muted)" mt={2} fontSize="md">
            {project.client} - {formatProjectPlatform(project.platform)} - Due {formatDate(project.dueDate)}
          </Text>
        </Box>

        <HStack gap={2} flexWrap="wrap">
          <Button variant="secondary" onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
          {canOpenPentestWorkspace && (
            <Button onClick={() => navigate(`/projects/pentest/${project.id}`)}>
              Open workspace
            </Button>
          )}
          {isAdmin && project.status !== "completed" && (
            <Button
              variant="secondary"
              onClick={manuallyCloseProject}
              isLoading={closeResult.isLoading}
            >
              Close project
            </Button>
          )}
        </HStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
        {metricItems(project).map((item) => (
          <Box
            key={item.label}
            bg="var(--apple-surface-raised)"
            border="1px solid"
            borderColor="var(--apple-border)"
            borderRadius="md"
            p={4}
            boxShadow="var(--surface-shadow)"
          >
            <DetailItem label={item.label} value={item.value} />
          </Box>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
        <DetailPanel title="Project identity">
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <DetailItem label="Project ID" value={project.id} />
            <DetailItem label="Group" value={formatCompactGroupId(project.projectGroupId)} />
            <DetailItem label="Canonical name" value={project.canonicalName} />
            <DetailItem label="Version" value={project.version} />
            <DetailItem label="Platform" value={formatProjectPlatform(project.platform)} />
            <DetailItem label="Letter number" value={project.letterNumber} />
            <DetailItem label="Created" value={formatDate(project.createdAt)} />
            <DetailItem label="Test expires" value={formatDate(project.testExpiresAt)} />
            <DetailItem label="Priority" value={project.priority} />
          </SimpleGrid>
        </DetailPanel>

        <DetailPanel title="Access and assignment">
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <DetailItem label="Owner" value={project.owner} />
            <DetailItem label="Assignee" value={project.assignee} />
            <DetailItem label="Created by" value={project.createdByUserId} />
            <DetailItem label="Security manager" value={project.securityManagerId} />
            <DetailItem label="Quality manager" value={project.qualityManagerId} />
            <DetailItem label="DevOps assignee" value={project.devopsAssigneeId} />
            <DetailItem label="Representative" value={project.representativeId} />
            <DetailItem
              label="Assigned users"
              value={project.assignedUserIds?.length ? project.assignedUserIds.join(", ") : "-"}
            />
          </SimpleGrid>
        </DetailPanel>
      </SimpleGrid>

      <DetailPanel title="Delivery context">
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          <DetailItem label="Environment" value={project.devopsInfo?.environment || project.environment} />
          <DetailItem label="Repository" value={project.devopsInfo?.repository || project.repository} />
          <DetailItem label="Pipeline" value={project.devopsInfo?.pipeline || project.pipeline} />
          <DetailItem label="Deployment URL" value={project.devopsInfo?.deploymentUrl} />
          <DetailItem label="Release branch" value={project.devopsInfo?.releaseBranch} />
          <DetailItem label="Server inventory" value={project.devopsInfo?.serverInventory} />
        </SimpleGrid>
        {project.devopsInfo?.notes && (
          <Box
            mt={5}
            p={4}
            borderRadius="md"
            bg="var(--apple-surface-subtle)"
            border="1px solid"
            borderColor="var(--apple-border-soft)"
          >
            <DetailItem label="Notes" value={project.devopsInfo.notes} />
          </Box>
        )}
      </DetailPanel>

      <DeadlineManagement project={project} isAdmin={isAdmin} />

      {isAdmin && project.discipline === "security" && (
        <AdminBugVisibilitySettings projectId={project.id} />
      )}
      <ProjectProvisioningPanel
        project={project}
        readOnly
        allowRepresentativeResolution
      />
      {project.discipline === "quality" &&
        project.provisioningStatus === "DEVOPS_READY" &&
        project.responsibilityContext?.capabilities["assign-project-members"] && (
          <QaAssignmentPanel project={project} />
        )}
    </VStack>
  );
}
