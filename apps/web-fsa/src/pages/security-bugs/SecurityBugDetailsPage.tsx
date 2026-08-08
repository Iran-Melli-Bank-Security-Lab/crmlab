import {
  Badge,
  Box,
  Grid,
  Heading,
  HStack,
  NativeSelect,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  BUG_REVIEW_STATE_VALUES,
  BUG_REVIEW_STATES,
  canTransitionBugReviewState,
  isBugReviewState,
  type BugReviewState,
} from "@role-dashboard/contracts";
import {
  useGetProjectBugForReviewQuery,
  useUpdateBugReviewStateMutation,
  type Vulnerability,
} from "@/entities/pentest/api/pentestApi";
import { useLanguage, type TranslationKey } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import BugEvidenceGallery from "./BugEvidenceGallery";
import { BUG_REVIEW_STATE_LABEL_KEYS } from "@/entities/pentest/model/bugReview";
import {
  formatAttachmentSize,
  getAttachmentPreviewUrl,
} from "@/entities/pentest/model/attachments";

type DetailEntry = {
  key: string;
  label: string;
  value: unknown;
  wide?: boolean;
};

function hasStoredValue(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function formatStoredValue(value: unknown): ReactNode {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.every((item) => ["string", "number", "boolean"].includes(typeof item))) {
      return value.map(String).join(" · ");
    }
    return JSON.stringify(value, null, 2);
  }
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DetailCard({ entry }: { entry: DetailEntry }) {
  const structured = typeof entry.value === "object" && entry.value !== null;
  return (
    <Box
      gridColumn={entry.wide ? { md: "1 / -1" } : undefined}
      p={3.5}
      minW={0}
      border="1px solid"
      borderColor="var(--apple-border-soft)"
      borderRadius="md"
      bg="var(--apple-surface-subtle)"
    >
      <Text
        color="var(--apple-muted)"
        fontSize="xs"
        fontWeight="800"
        letterSpacing=".02em"
        mb={1.5}
      >
        {entry.label}
      </Text>
      <Text
        as={structured ? "pre" : "div"}
        m={0}
        fontFamily={structured ? "mono" : "inherit"}
        fontSize={structured ? "xs" : "sm"}
        lineHeight="1.65"
        color="var(--apple-text)"
        whiteSpace="pre-wrap"
        overflowWrap="anywhere"
      >
        {formatStoredValue(entry.value)}
      </Text>
    </Box>
  );
}

function DetailsSection({
  title,
  description,
  entries,
}: {
  title: string;
  description?: string;
  entries: DetailEntry[];
}) {
  const visibleEntries = entries.filter((entry) => hasStoredValue(entry.value));
  if (!visibleEntries.length) return null;
  return (
    <Box
      p={{ base: 4, md: 5 }}
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="lg"
      bg="var(--apple-surface-raised)"
      boxShadow="var(--surface-shadow)"
    >
      <Heading size="md">{title}</Heading>
      {description && (
        <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
          {description}
        </Text>
      )}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mt={4}>
        {visibleEntries.map((entry) => (
          <DetailCard key={entry.key} entry={entry} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

const DISPLAYED_KEYS = new Set([
  "_id", "id", "__v", "projectId", "project",
  "checklistItemId", "checklistItemCode", "checklistItemTitle", "owaspCategory",
  "securityStandardId", "securityStandardKey", "securityStandardVersion",
  "securityStandardType", "securityStandardNodeId", "securityStandardPathNodeIds",
  "securityStandardPathLabels", "itemAssessmentId", "cvss",
  "title", "bugTitle", "label", "labelfa", "wstg", "severity", "description",
  "affectedAsset", "evidence", "reproductionSteps", "exploits", "impact",
  "recommendation", "solutions", "cve", "CVE", "cveCvss", "CVSS", "httpMethod",
  "path", "paths", "parameter", "affectedUsername", "affectedUserRole",
  "exploitDetails", "solution", "toolsUsed", "references",
  "requestHeaders", "requestHeadersFile",
  "refrence", "securingByOptions", "securingByWAF", "securingMethods",
  "wafSecuringPossibility", "pocs", "tools", "parameters", "other_information",
  "status", "state", "stateChangedBy", "stateChangedAt", "createdBy", "user",
  "pentester", "creator", "reporter", "created_at", "updated_at", "createdAt",
  "updatedAt", "additionalInformation", "isOwn", "canReview", "submitter",
]);

function localizedRecordDate(value: unknown, language: "en" | "fa") {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    language === "fa" ? "fa-IR-u-ca-persian" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function labels(
  t: (key: TranslationKey, values?: Record<string, string | number>) => string
) {
  return {
    overview: [
      ["title", t("pentestWorkspace.findings.title")],
      ["labelfa", t("bugReview.stored.persianLabel")],
      ["wstg", "WSTG"],
      ["description", t("bugReview.description")],
      ["affectedAsset", t("pentestWorkspace.findings.asset")],
      ["evidence", t("pentestWorkspace.findings.evidence")],
      ["reproductionSteps", t("pentestWorkspace.findings.reproductionSteps")],
      ["exploitDetails", t("pentestWorkspace.findings.exploitDetails")],
      ["exploits", t("bugReview.stored.legacyExploit")],
      ["impact", t("bugReview.impact")],
      ["recommendation", t("pentestWorkspace.findings.recommendation")],
      ["solution", t("bugReview.solution")],
      ["solutions", t("bugReview.stored.legacySolution")],
      ["other_information", t("bugReview.stored.otherInformation")],
    ],
    technical: [
      ["severity", t("bugReview.severity")],
      ["cve", t("pentestWorkspace.findings.cve")],
      ["CVE", t("bugReview.stored.legacyCve")],
      ["cveCvss", t("pentestWorkspace.findings.cveCvss")],
      ["CVSS", t("bugReview.stored.legacyCvss")],
      ["httpMethod", t("bugReview.method")],
      ["parameter", t("bugReview.parameter")],
      ["toolsUsed", t("pentestWorkspace.findings.toolsUsed")],
      ["tools", t("bugReview.stored.tools")],
      ["parameters", t("bugReview.stored.parameters")],
      ["references", t("pentestWorkspace.findings.references")],
      ["refrence", t("bugReview.stored.legacyReferences")],
      ["securingMethods", t("pentestWorkspace.findings.securingMethods")],
      ["securingByOptions", t("bugReview.stored.securingOptions")],
      ["wafSecuringPossibility", t("pentestWorkspace.findings.wafPossibility")],
      ["securingByWAF", t("bugReview.stored.legacyWaf")],
    ],
    classification: [
      ["checklistItemId", t("bugReview.stored.checklistItemId")],
      ["checklistItemCode", t("bugReview.stored.checklistItemCode")],
      ["checklistItemTitle", t("bugReview.stored.checklistItemTitle")],
      ["owaspCategory", t("bugReview.stored.owaspCategory")],
      ["securityStandardId", t("bugReview.stored.standardId")],
      ["securityStandardKey", t("bugReview.stored.standardKey")],
      ["securityStandardVersion", t("bugReview.stored.standardVersion")],
      ["securityStandardType", t("bugReview.stored.standardType")],
      ["securityStandardNodeId", t("bugReview.stored.standardNode")],
      ["securityStandardPathNodeIds", t("bugReview.stored.standardPathIds")],
      ["securityStandardPathLabels", t("bugReview.stored.standardPath")],
      ["itemAssessmentId", t("bugReview.stored.assessmentId")],
      ["cvss", "CVSS 4.0"],
    ],
    record: [
      ["_id", t("bugReview.stored.bugId")],
      ["id", t("bugReview.stored.bugId")],
      ["projectId", t("bugReview.stored.projectId")],
      ["project", t("bugReview.stored.legacyProjectId")],
      ["status", t("bugReview.stored.compatibilityStatus")],
      ["state", t("bugReview.reviewState")],
      ["createdBy", t("bugReview.stored.createdBy")],
      ["user", t("bugReview.stored.legacyUser")],
      ["pentester", t("bugReview.stored.pentester")],
      ["creator", t("bugReview.stored.creator")],
      ["reporter", t("bugReview.stored.reporter")],
      ["stateChangedBy", t("bugReview.stored.stateChangedBy")],
      ["stateChangedAt", t("bugReview.stored.stateChangedAt")],
      ["createdAt", t("bugReview.stored.createdAt")],
      ["created_at", t("bugReview.stored.legacyCreatedAt")],
      ["updatedAt", t("bugReview.stored.updatedAt")],
      ["updated_at", t("bugReview.stored.legacyUpdatedAt")],
      ["__v", t("bugReview.stored.recordVersion")],
    ],
  } as const;
}

function entriesFor(
  bug: Vulnerability,
  definitions: readonly (readonly [string, string])[]
): DetailEntry[] {
  return definitions.map(([key, label]) => ({
    key,
    label,
    value: bug[key],
    wide: [
      "description", "evidence", "reproductionSteps", "exploitDetails",
      "exploits", "impact", "recommendation", "solution", "solutions",
      "other_information", "cvss",
    ].includes(key),
  }));
}

export default function SecurityBugDetailsPage() {
  const { projectId = "", bugId = "" } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { data: bug, isLoading, error, refetch } =
    useGetProjectBugForReviewQuery(
      { projectId, bugId },
      { skip: !projectId || !bugId }
    );
  const [updateState, updateResult] = useUpdateBugReviewStateMutation();
  const [selectedState, setSelectedState] = useState<BugReviewState>();
  const fieldLabels = useMemo(() => labels(t), [t]);

  if (isLoading) return <LoadingScreen text={t("bugReview.loading")} />;
  if (error || !bug) {
    return (
      <VStack align="stretch">
        <ErrorState error={error} title={t("bugReview.loadError")} />
        <Button alignSelf="start" variant="secondary" onClick={() => refetch()}>
          {t("bugReview.retry")}
        </Button>
      </VStack>
    );
  }

  const currentState = bug.state || BUG_REVIEW_STATES.NEW;
  const affectedPaths = bug.paths?.length
    ? bug.paths
    : bug.path
      ? [bug.path]
      : [];
  const effectiveSelectedState = selectedState ||
    (isBugReviewState(currentState) ? currentState : BUG_REVIEW_STATES.NEW);
  const allowedStates = BUG_REVIEW_STATE_VALUES.filter((state) =>
    canTransitionBugReviewState(currentState, state)
  );
  const additionalEntries = Object.entries(bug)
    .filter(([key, value]) => !DISPLAYED_KEYS.has(key) && hasStoredValue(value))
    .map(([key, value]) => ({ key, label: key, value, wide: true }));

  const saveState = async () => {
    try {
      await updateState({
        projectId,
        bugId,
        state: effectiveSelectedState,
      }).unwrap();
      setSelectedState(undefined);
      toast.success(t("bugReview.stateSaved"));
    } catch {
      toast.error(t("bugReview.stateSaveError"));
    }
  };

  return (
    <VStack align="stretch" gap={5} maxW="1500px" mx="auto">
      <Box
        p={{ base: 4, md: 6 }}
        border="1px solid"
        borderColor="var(--apple-border)"
        borderRadius="xl"
        bg="var(--apple-surface-raised)"
        boxShadow="var(--surface-shadow)"
      >
        <HStack justify="space-between" align="start" gap={5} flexWrap="wrap">
          <Box minW={0} flex="1">
            <HStack gap={2} mb={3} flexWrap="wrap">
              <Badge colorPalette={bug.severity === "critical" ? "red" : "orange"}>
                {bug.severity}
              </Badge>
              <Badge variant="subtle">
                {isBugReviewState(currentState)
                  ? t(BUG_REVIEW_STATE_LABEL_KEYS[currentState])
                  : currentState}
              </Badge>
              {bug.securityStandardKey && (
                <Badge variant="outline">{bug.securityStandardKey}</Badge>
              )}
            </HStack>
            <Heading size={{ base: "lg", md: "xl" }} overflowWrap="anywhere">
              {bug.title}
            </Heading>
            <Text color="var(--apple-muted)" mt={2}>
              {t("bugReview.detailsDescription")}
            </Text>
          </Box>
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/bugs`)}
          >
            {t("bugReview.backToList")}
          </Button>
        </HStack>
      </Box>

      <Grid
        templateColumns={{
          base: "minmax(0, 1fr)",
          xl: bug.canReview ? "minmax(0, 1fr) 360px" : "minmax(0, 1fr)",
        }}
        gap={5}
        alignItems="start"
      >
        <VStack align="stretch" gap={5}>
          <DetailsSection
            title="Submission information"
            entries={[
              {
                key: "submitter",
                label: "Submitter",
                value: bug.submitter?.username
                  ? `${bug.submitter.name} (${bug.submitter.username})`
                  : bug.submitter?.name,
              },
              {
                key: "submittedAt",
                label: "Date",
                value: localizedRecordDate(
                  bug.createdAt || bug.created_at,
                  language
                ),
              },
            ]}
          />
          <DetailsSection
            title={t("bugReview.sections.submission")}
            description={t("bugReview.sections.submissionDescription")}
            entries={entriesFor(bug, fieldLabels.overview)}
          />
          <DetailsSection
            title={t("bugReview.sections.technical")}
            entries={entriesFor(bug, fieldLabels.technical)}
          />
          <DetailsSection
            title={t("bugReview.sections.affectedUser")}
            entries={[
              {
                key: "affectedUsername",
                label: t("pentestWorkspace.findings.affectedUsername"),
                value: bug.affectedUsername,
              },
              {
                key: "affectedUserRole",
                label: t("pentestWorkspace.findings.affectedUserRole"),
                value: bug.affectedUserRole,
              },
            ]}
          />
          {affectedPaths.length > 0 && (
            <Box
              p={{ base: 4, md: 5 }}
              border="1px solid"
              borderColor="var(--apple-border)"
              borderRadius="lg"
              bg="var(--apple-surface-raised)"
              boxShadow="var(--surface-shadow)"
            >
              <Heading size="md">
                {t("pentestWorkspace.findings.affectedPaths")}
              </Heading>
              <VStack align="stretch" gap={2} mt={4}>
                {affectedPaths.map((path) => (
                  <Box
                    key={path}
                    p={3}
                    border="1px solid"
                    borderColor="var(--apple-border-soft)"
                    borderRadius="md"
                    bg="var(--apple-surface-subtle)"
                  >
                    <Text
                      fontFamily="mono"
                      fontSize="xs"
                      overflowWrap="anywhere"
                      dir="ltr"
                      textAlign="start"
                    >
                      {path}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
          {(bug.requestHeaders || bug.requestHeadersFile) && (
            <Box
              p={{ base: 4, md: 5 }}
              border="1px solid"
              borderColor="var(--apple-border)"
              borderRadius="lg"
              bg="var(--apple-surface-raised)"
              boxShadow="var(--surface-shadow)"
            >
              <Heading size="md">
                {t("pentestWorkspace.requestHeaders.title")}
              </Heading>
              {bug.requestHeaders && (
                <Text
                  as="pre"
                  m={0}
                  mt={4}
                  p={3.5}
                  borderRadius="md"
                  bg="var(--apple-surface-subtle)"
                  fontFamily="mono"
                  fontSize="xs"
                  lineHeight="1.65"
                  whiteSpace="pre-wrap"
                  overflowWrap="anywhere"
                  dir="ltr"
                  textAlign="start"
                >
                  {bug.requestHeaders}
                </Text>
              )}
              {bug.requestHeadersFile && (
                <HStack
                  mt={4}
                  p={3}
                  border="1px solid"
                  borderColor="var(--apple-border-soft)"
                  borderRadius="md"
                  flexWrap="wrap"
                >
                  <Box flex="1" minW="220px">
                    <Text fontWeight="800" lineClamp={1}>
                      {bug.requestHeadersFile.originalName}
                    </Text>
                    <Text color="var(--apple-muted)" fontSize="xs">
                      {formatAttachmentSize(bug.requestHeadersFile.size)}
                    </Text>
                  </Box>
                  <Button asChild variant="secondary">
                    <a
                      href={getAttachmentPreviewUrl(bug.requestHeadersFile.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("pentestWorkspace.requestHeaders.viewFile")}
                    </a>
                  </Button>
                  <Button asChild variant="secondary">
                    <a href={bug.requestHeadersFile.url}>
                      {t("pentestWorkspace.requestHeaders.downloadFile")}
                    </a>
                  </Button>
                </HStack>
              )}
            </Box>
          )}
          <DetailsSection
            title={t("bugReview.sections.classification")}
            entries={entriesFor(bug, fieldLabels.classification)}
          />
          <DetailsSection
            title={t("bugReview.sections.additionalInformation")}
            description={t(
              "bugReview.sections.additionalInformationDescription"
            )}
            entries={(bug.additionalInformation || []).map((entry, index) => ({
              key: entry._id || `additional-information-${index}`,
              label: new Date(entry.submittedAt).toLocaleString(),
              value: entry.text,
              wide: true,
            }))}
          />
        </VStack>

        {bug.canReview && <Box
          position={{ xl: "sticky" }}
          top={{ xl: "20px" }}
          p={4}
          border="1px solid"
          borderColor="var(--apple-blue-border)"
          borderRadius="lg"
          bg="var(--apple-blue-soft)"
        >
          <Heading size="sm">{t("bugReview.reviewState")}</Heading>
          <Text color="var(--apple-secondary)" fontSize="sm" mt={1} mb={3}>
            {t("bugReview.reviewHelp")}
          </Text>
          <NativeSelect.Root width="full">
            <NativeSelect.Field
              value={effectiveSelectedState}
              onChange={(event) =>
                setSelectedState(event.target.value as BugReviewState)
              }
              bg="var(--apple-surface-raised)"
            >
              {allowedStates.map((state) => (
                <option key={state} value={state}>
                  {t(BUG_REVIEW_STATE_LABEL_KEYS[state])}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Button
            width="full"
            mt={3}
            onClick={saveState}
            isLoading={updateResult.isLoading}
            disabled={effectiveSelectedState === currentState}
          >
            {t("bugReview.saveState")}
          </Button>
        </Box>}
      </Grid>

      <Box
        p={{ base: 4, md: 5 }}
        border="1px solid"
        borderColor="var(--apple-border)"
        borderRadius="lg"
        bg="var(--apple-surface-raised)"
        boxShadow="var(--surface-shadow)"
      >
        <BugEvidenceGallery pocs={bug.pocs || []} />
      </Box>

      <DetailsSection
        title={t("bugReview.sections.record")}
        description={t("bugReview.sections.recordDescription")}
        entries={entriesFor(bug, fieldLabels.record)}
      />
      <DetailsSection
        title={t("bugReview.sections.additional")}
        description={t("bugReview.sections.additionalDescription")}
        entries={additionalEntries}
      />
    </VStack>
  );
}
