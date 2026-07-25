import {
  Badge,
  Box,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetProjectBugsForReviewQuery,
  type Vulnerability,
} from "@/entities/pentest/api/pentestApi";
import { BUG_REVIEW_STATE_LABEL_KEYS } from "@/entities/pentest/model/bugReview";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";
import ErrorState from "@/shared/ui/feedback/ErrorState";
import LoadingScreen from "@/shared/ui/feedback/LoadingScreen";
import { isBugReviewState } from "@role-dashboard/contracts";

function bugId(bug: Vulnerability) {
  return bug.id || bug._id || "";
}

export default function SecurityProjectBugsPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: bugs = [], isLoading, error, refetch } =
    useGetProjectBugsForReviewQuery(projectId, { skip: !projectId });

  if (isLoading) return <LoadingScreen text={t("bugReview.loading")} />;

  return (
    <VStack align="stretch" gap={5}>
      <HStack justify="space-between" align="start" flexWrap="wrap">
        <Box>
          <Heading size="lg" color="var(--apple-text)">
            {t("bugReview.listTitle")}
          </Heading>
          <Text color="var(--apple-muted)" mt={1}>
            {t("bugReview.listDescription")}
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

      {!error && bugs.length === 0 && (
        <Box
          p={8}
          textAlign="center"
          border="1px solid"
          borderColor="var(--apple-border)"
          borderRadius="lg"
          bg="var(--apple-surface-raised)"
        >
          <Heading size="sm">{t("bugReview.emptyTitle")}</Heading>
          <Text color="var(--apple-muted)" mt={2}>
            {t("bugReview.emptyDescription")}
          </Text>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
        {bugs.map((bug) => (
          <Box
            key={bugId(bug)}
            p={4}
            border="1px solid"
            borderColor="var(--apple-border)"
            borderRadius="lg"
            bg="var(--apple-surface-raised)"
            cursor="pointer"
            _hover={{ borderColor: "var(--apple-blue-border)", boxShadow: "var(--surface-shadow)" }}
            onClick={() =>
              navigate(`/projects/${projectId}/bugs/${bugId(bug)}`)
            }
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
            <HStack mt={4} justify="space-between">
              <Badge variant="subtle">
                {isBugReviewState(bug.state)
                  ? t(BUG_REVIEW_STATE_LABEL_KEYS[bug.state])
                  : bug.state || t("bugReview.state.new")}
              </Badge>
              <Text color="var(--apple-blue)" fontSize="sm" fontWeight="700">
                {t("bugReview.openDetails")}
              </Text>
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  );
}
