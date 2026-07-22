import { Badge, Box, HStack, Popover, Portal, Text, VStack } from "@chakra-ui/react";
import {
  PROJECT_RESPONSIBILITY_BY_KEY,
  type ProjectResponsibilityIcon,
  type ProjectResponsibilityKey,
} from "@role-dashboard/contracts";
import { useLanguage } from "@/features/language/model";

function ResponsibilityIcon({ name }: { name: ProjectResponsibilityIcon }) {
  const paths: Record<ProjectResponsibilityIcon, string> = {
    crown: "M4 8l3 3 5-6 5 6 3-3-2 10H6L4 8Z",
    flask: "M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M8 14h8",
    gear: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4",
    representative: "M4 20V8l8-5 8 5v12M8 20v-7h8v7M3 20h18",
    shield: "M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4",
    test: "M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3m-2 12 2 2 4-4",
    "user-check": "M15 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M8.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5 1 2 2 4-4",
  };
  return (
    <Box as="span" aria-hidden flexShrink={0} lineHeight="0">
      <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
        <path
          d={paths[name]}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </Box>
  );
}

function ResponsibilityBadge({
  responsibility,
  compact = false,
}: {
  responsibility: ProjectResponsibilityKey;
  compact?: boolean;
}) {
  const { language } = useLanguage();
  const definition = PROJECT_RESPONSIBILITY_BY_KEY[responsibility];
  const label = language === "fa"
    ? compact ? definition.faShortLabel : definition.faLabel
    : compact ? definition.shortLabel : definition.defaultLabel;

  return (
    <Badge
      colorPalette={definition.colorPalette}
      variant="subtle"
      borderRadius="full"
      px={2}
      py={0.5}
      fontSize="xs"
      fontWeight="750"
      textTransform="none"
      whiteSpace="nowrap"
    >
      <HStack gap={1}>
        <ResponsibilityIcon name={definition.icon} />
        <Text as="span">{label}</Text>
      </HStack>
    </Badge>
  );
}

export default function ProjectResponsibilities({
  responsibilities = [],
}: {
  responsibilities?: ProjectResponsibilityKey[];
}) {
  const { dir, t } = useLanguage();
  if (!responsibilities.length) return <Text color="var(--apple-muted)">—</Text>;

  const visible = responsibilities.length > 2
    ? responsibilities.slice(0, 1)
    : responsibilities;
  const hiddenCount = responsibilities.length - visible.length;

  return (
    <HStack gap={1.5} flexWrap="nowrap" dir={dir}>
      {visible.map((responsibility) => (
        <ResponsibilityBadge
          key={responsibility}
          responsibility={responsibility}
          compact
        />
      ))}
      {hiddenCount > 0 && (
        <Popover.Root positioning={{ placement: "bottom-start", gutter: 6 }}>
          <Popover.Trigger asChild>
            <Badge
              as="button"
              colorPalette="gray"
              variant="subtle"
              borderRadius="full"
              cursor="pointer"
              px={2}
              py={0.5}
              fontSize="xs"
              fontWeight="800"
              aria-label={t("projectTable.responsibilities.showAll", {
                count: responsibilities.length,
              })}
              onClick={(event) => event.stopPropagation()}
            >
              +{hiddenCount}
            </Badge>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content
                dir={dir}
                maxW="300px"
                borderColor="var(--apple-border)"
                bg="var(--apple-surface-raised)"
                onClick={(event) => event.stopPropagation()}
              >
                <Popover.Arrow />
                <Popover.Body p={3}>
                  <Text fontSize="xs" fontWeight="800" mb={2}>
                    {t("projectTable.columns.myResponsibilities")}
                  </Text>
                  <VStack align="stretch" gap={1.5}>
                    {responsibilities.map((responsibility) => (
                      <ResponsibilityBadge
                        key={responsibility}
                        responsibility={responsibility}
                      />
                    ))}
                  </VStack>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
      )}
    </HStack>
  );
}
