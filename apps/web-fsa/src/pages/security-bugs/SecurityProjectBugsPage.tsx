import {
  Badge,
  Box,
  Heading,
  HStack,
  NativeSelect,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetProjectBugsForReviewQuery,
  type Vulnerability,
} from "@/entities/pentest/api/pentestApi";
import { BUG_REVIEW_STATE_LABEL_KEYS } from "@/entities/pentest/model/bugReview";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";
import Input from "@/shared/ui/primitives/Input";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import { isBugReviewState } from "@role-dashboard/contracts";

function bugId(bug: Vulnerability) {
  return bug.id || bug._id || "";
}

function bugDate(bug: Vulnerability) {
  return bug.createdAt || bug.created_at || "";
}

function formatLocalizedDate(value: string, language: "en" | "fa") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(
    language === "fa" ? "fa-IR-u-ca-persian" : "en-US",
    { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
  ).format(date);
}

function BugCard({
  bug,
  projectId,
  language,
  onOpen,
}: {
  bug: Vulnerability;
  projectId: string;
  language: "en" | "fa";
  onOpen: (path: string) => void;
}) {
  const { t } = useLanguage();
  const state = bug.state || "New";
  return (
    <Box
      p={4}
      border="1px solid"
      borderColor="var(--apple-border)"
      borderRadius="lg"
      bg="var(--apple-surface-raised)"
      cursor="pointer"
      transition="border-color 160ms ease, box-shadow 160ms ease"
      _hover={{ borderColor: "var(--apple-blue-border)", boxShadow: "var(--surface-shadow)" }}
      onClick={() => onOpen(`/projects/${projectId}/bugs/${bugId(bug)}`)}
    >
      <HStack justify="space-between" align="start" gap={3}>
        <Box minW={0}>
          <Heading size="sm" lineClamp={1}>{bug.title}</Heading>
          <Text mt={1} color="var(--apple-muted)" fontSize="sm" lineClamp={2}>
            {bug.description || t("bugReview.noDescription")}
          </Text>
        </Box>
        <Badge colorPalette={bug.severity === "critical" ? "red" : "orange"}>
          {bug.severity}
        </Badge>
      </HStack>
      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3} mt={4}>
        <Box>
          <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800">Submitter</Text>
          <Text fontSize="sm" fontWeight="700" mt={1}>
            {bug.submitter?.name || "—"}
          </Text>
        </Box>
        <Box>
          <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800">Status</Text>
          <Text fontSize="sm" fontWeight="700" mt={1}>
            {isBugReviewState(state) ? t(BUG_REVIEW_STATE_LABEL_KEYS[state]) : state}
          </Text>
        </Box>
        <Box>
          <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800">Date</Text>
          <Text fontSize="sm" fontWeight="700" mt={1}>
            {formatLocalizedDate(bugDate(bug), language)}
          </Text>
        </Box>
      </SimpleGrid>
    </Box>
  );
}

export default function SecurityProjectBugsPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { data, isLoading, error, refetch } =
    useGetProjectBugsForReviewQuery(projectId, { skip: !projectId });
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const bugs = data?.items || [];
  const submitters = useMemo(() => Array.from(
    bugs.reduce((submitterMap, bug) => {
      if (bug.submitter) submitterMap.set(bug.submitter.id, bug.submitter);
      return submitterMap;
    }, new Map<string, NonNullable<Vulnerability["submitter"]>>()).values()
  ), [bugs]);
  const statuses = useMemo(
    () => [...new Set(bugs.map((bug) => String(bug.state || "New")))],
    [bugs]
  );
  const filtered = useMemo(() => bugs.filter((bug) => {
    if (userFilter !== "all" && bug.submitter?.id !== userFilter) return false;
    if (statusFilter !== "all" && String(bug.state || "New") !== statusFilter) return false;
    const created = new Date(bugDate(bug)).getTime();
    if (fromDate && created < new Date(`${fromDate}T00:00:00`).getTime()) return false;
    if (toDate && created > new Date(`${toDate}T23:59:59.999`).getTime()) return false;
    return true;
  }), [bugs, fromDate, statusFilter, toDate, userFilter]);
  const myBugs = filtered.filter((bug) => bug.isOwn);
  const otherVerifiedBugs = filtered.filter((bug) => !bug.isOwn);

  if (isLoading) return <LoadingScreen text={t("bugReview.loading")} />;

  return (
    <VStack align="stretch" gap={5}>
      <HStack justify="space-between" align="start" flexWrap="wrap">
        <Box>
          <Heading size="lg" color="var(--apple-text)">Project Bugs</Heading>
          <Text color="var(--apple-muted)" mt={1}>
            Review your findings and eligible verified findings from other pentesters.
          </Text>
        </Box>
        <Button variant="secondary" onClick={() => navigate("/projects")}>
          {t("bugReview.backToProjects")}
        </Button>
      </HStack>

      {error && (
        <VStack align="stretch">
          <ErrorState error={error} title={t("bugReview.loadError")} />
          <Button alignSelf="start" variant="secondary" onClick={() => refetch()}>
            {t("bugReview.retry")}
          </Button>
        </VStack>
      )}

      {!error && data?.access.mode === "pentester" &&
        data.access.timeRequirementEnabled && !data.access.canViewOthers && (
        <Box
          p={4}
          border="1px solid"
          borderColor="var(--apple-warning-border)"
          borderRadius="lg"
          bg="var(--apple-warning-bg)"
        >
          <Text fontWeight="850">Verified team findings are time-gated</Text>
          <Text fontSize="sm" mt={1} color="var(--apple-secondary)">
            You have {data.access.totalWorkTimeHours?.toFixed(1) || "0.0"} of the required {data.access.effectiveRequiredHours || 30} hours. Your own bugs remain available.
          </Text>
        </Box>
      )}

      {!error && (
        <Box p={4} border="1px solid" borderColor="var(--apple-border)" borderRadius="lg" bg="var(--apple-surface-raised)">
          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={3}>
            <NativeSelect.Root>
              <NativeSelect.Field value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
                <option value="all">All submitters</option>
                {submitters.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <NativeSelect.Root>
              <NativeSelect.Field value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {isBugReviewState(status) ? t(BUG_REVIEW_STATE_LABEL_KEYS[status]) : status}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Input type="date" aria-label="From date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <Input type="date" aria-label="To date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </SimpleGrid>
        </Box>
      )}

      {!error && data?.access.mode === "manager" && (
        <Box>
          <HStack justify="space-between" mb={3}>
            <Heading size="md">All Project Bugs</Heading>
            <Badge variant="subtle">{filtered.length}</Badge>
          </HStack>
          {filtered.length ? (
            <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>
              {filtered.map((bug) => <BugCard key={bugId(bug)} bug={bug} projectId={projectId} language={language} onOpen={navigate} />)}
            </SimpleGrid>
          ) : <Text color="var(--apple-muted)">No bugs match the selected filters.</Text>}
        </Box>
      )}

      {!error && data?.access.mode !== "manager" && (
        <>
          <Box>
            <HStack justify="space-between" mb={3}>
              <Heading size="md">My Bugs</Heading>
              <Badge variant="subtle">{myBugs.length}</Badge>
            </HStack>
            {myBugs.length ? (
              <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>
                {myBugs.map((bug) => <BugCard key={bugId(bug)} bug={bug} projectId={projectId} language={language} onOpen={navigate} />)}
              </SimpleGrid>
            ) : <Text color="var(--apple-muted)">No bugs match the selected filters.</Text>}
          </Box>

          {data?.access.canViewOthers ? (
            <Box>
              <HStack justify="space-between" mb={3}>
                <Heading size="md">Verified Bugs from Other Users</Heading>
                <Badge variant="subtle">{otherVerifiedBugs.length}</Badge>
              </HStack>
              {otherVerifiedBugs.length ? (
                <SimpleGrid columns={{ base: 1, xl: 2 }} gap={3}>
                  {otherVerifiedBugs.map((bug) => <BugCard key={bugId(bug)} bug={bug} projectId={projectId} language={language} onOpen={navigate} />)}
                </SimpleGrid>
              ) : <Text color="var(--apple-muted)">No eligible verified bugs match the selected filters.</Text>}
            </Box>
          ) : null}
        </>
      )}
    </VStack>
  );
}
