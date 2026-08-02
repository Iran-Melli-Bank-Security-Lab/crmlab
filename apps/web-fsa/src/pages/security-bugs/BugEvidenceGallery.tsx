import {
  Badge,
  Box,
  CloseButton,
  Dialog,
  Heading,
  HStack,
  Image,
  Portal,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import {
  formatAttachmentSize,
  getAttachmentPreviewUrl,
  type PersistedPoc,
} from "@/entities/pentest/model/attachments";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";

function AttachmentMeta({ poc }: { poc: PersistedPoc }) {
  return (
    <Box minW={0}>
      <Text fontWeight="800" lineClamp={1}>{poc.originalName}</Text>
      <Text color="var(--apple-muted)" fontSize="xs">
        {poc.mimeType || "application/octet-stream"} · {formatAttachmentSize(poc.size || 0)}
      </Text>
    </Box>
  );
}

export default function BugEvidenceGallery({ pocs }: { pocs: PersistedPoc[] }) {
  const { t } = useLanguage();
  const [previewIndex, setPreviewIndex] = useState<number>();
  const images = useMemo(
    () => pocs.filter((poc) => poc.mediaType === "image"),
    [pocs]
  );
  const videos = useMemo(
    () => pocs.filter((poc) => poc.mediaType === "video"),
    [pocs]
  );
  const documents = useMemo(
    () => pocs.filter((poc) => poc.mediaType === "document"),
    [pocs]
  );
  const preview = previewIndex === undefined ? undefined : images[previewIndex];

  if (!pocs.length) {
    return (
      <Box
        border="1px dashed"
        borderColor="var(--apple-border)"
        borderRadius="lg"
        p={6}
        textAlign="center"
      >
        <Text color="var(--apple-muted)">{t("bugReview.attachments.empty")}</Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" flexWrap="wrap">
        <Box>
          <Heading size="md">{t("bugReview.attachments.title")}</Heading>
          <Text color="var(--apple-muted)" fontSize="sm" mt={1}>
            {t("bugReview.attachments.count", { count: pocs.length })}
          </Text>
        </Box>
        <Badge variant="subtle">{pocs.length}</Badge>
      </HStack>

      {images.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>{t("bugReview.attachments.images")}</Heading>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={3}>
            {images.map((poc, index) => (
              <Box
                key={poc.fileId}
                asChild
                textAlign="start"
                overflow="hidden"
                border="1px solid"
                borderColor="var(--apple-border)"
                borderRadius="lg"
                bg="var(--apple-surface-subtle)"
                _hover={{ borderColor: "var(--apple-blue-border)", boxShadow: "var(--surface-shadow)" }}
              >
                <button type="button" onClick={() => setPreviewIndex(index)}>
                  <Image
                    src={getAttachmentPreviewUrl(poc.url)}
                    alt={poc.originalName}
                    width="full"
                    height="190px"
                    objectFit="cover"
                    loading="lazy"
                  />
                  <Box p={3}><AttachmentMeta poc={poc} /></Box>
                </button>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {videos.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>{t("bugReview.attachments.videos")}</Heading>
          <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
            {videos.map((poc) => (
              <Box
                key={poc.fileId}
                overflow="hidden"
                border="1px solid"
                borderColor="var(--apple-border)"
                borderRadius="lg"
                bg="black"
              >
                <video
                  controls
                  preload="metadata"
                  src={getAttachmentPreviewUrl(poc.url)}
                  aria-label={poc.originalName}
                  style={{ display: "block", width: "100%", maxHeight: "420px" }}
                />
                <HStack
                  justify="space-between"
                  p={3}
                  bg="var(--apple-surface-raised)"
                  align="center"
                >
                  <AttachmentMeta poc={poc} />
                  <Button asChild variant="secondary">
                    <a href={poc.url}>{t("bugReview.attachments.download")}</a>
                  </Button>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {documents.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>{t("bugReview.attachments.files")}</Heading>
          <VStack align="stretch" gap={2}>
            {documents.map((poc) => (
              <HStack
                key={poc.fileId}
                justify="space-between"
                gap={3}
                p={3}
                border="1px solid"
                borderColor="var(--apple-border)"
                borderRadius="lg"
                bg="var(--apple-surface-subtle)"
                flexWrap={{ base: "wrap", sm: "nowrap" }}
              >
                <AttachmentMeta poc={poc} />
                <HStack>
                  <Button asChild variant="secondary">
                    <a
                      href={getAttachmentPreviewUrl(poc.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("bugReview.attachments.open")}
                    </a>
                  </Button>
                  <Button asChild variant="secondary">
                    <a href={poc.url}>{t("bugReview.attachments.download")}</a>
                  </Button>
                </HStack>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      <Dialog.Root
        open={preview !== undefined}
        size="full"
        onOpenChange={(event) => {
          if (!event.open) setPreviewIndex(undefined);
        }}
      >
        <Portal>
          <Dialog.Backdrop bg="rgba(0, 0, 0, 0.92)" />
          <Dialog.Positioner>
            <Dialog.Content bg="rgba(8, 10, 14, 0.98)" color="white">
              <Dialog.Header borderBottom="1px solid" borderColor="whiteAlpha.300">
                <Box minW={0} pe={12}>
                  <Dialog.Title lineClamp={1}>
                    {preview?.originalName}
                  </Dialog.Title>
                  <Dialog.Description color="whiteAlpha.700">
                    {previewIndex === undefined
                      ? ""
                      : `${previewIndex + 1} / ${images.length}`}
                  </Dialog.Description>
                </Box>
              </Dialog.Header>
              <Dialog.Body
                display="flex"
                alignItems="center"
                justifyContent="center"
                minH={0}
                p={{ base: 2, md: 6 }}
              >
                {preview && (
                  <Image
                    src={getAttachmentPreviewUrl(preview.url)}
                    alt={preview.originalName}
                    maxW="100%"
                    maxH="calc(100dvh - 190px)"
                    objectFit="contain"
                  />
                )}
              </Dialog.Body>
              <Dialog.Footer
                justifyContent="center"
                borderTop="1px solid"
                borderColor="whiteAlpha.300"
              >
                <Button
                  variant="secondary"
                  disabled={previewIndex === 0}
                  onClick={() =>
                    setPreviewIndex((current) =>
                      current === undefined ? current : Math.max(0, current - 1)
                    )
                  }
                >
                  {t("bugReview.attachments.previous")}
                </Button>
                <Button asChild variant="secondary">
                  <a href={preview?.url}>{t("bugReview.attachments.download")}</a>
                </Button>
                <Button
                  variant="secondary"
                  disabled={previewIndex === images.length - 1}
                  onClick={() =>
                    setPreviewIndex((current) =>
                      current === undefined
                        ? current
                        : Math.min(images.length - 1, current + 1)
                    )
                  }
                >
                  {t("bugReview.attachments.next")}
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton
                  position="absolute"
                  top="3"
                  insetEnd="3"
                  color="white"
                  aria-label={t("bugReview.attachments.closePreview")}
                />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </VStack>
  );
}
