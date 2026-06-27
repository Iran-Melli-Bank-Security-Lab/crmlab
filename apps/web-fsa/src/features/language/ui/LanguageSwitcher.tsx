import { Box, Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import { useLanguage, type Language } from "@/features/language/model";

const languages: Array<{
  value: Language;
  shortLabel: string;
  direction: string;
}> = [
  { value: "en", shortLabel: "EN", direction: "LTR" },
  { value: "fa", shortLabel: "FA", direction: "RTL" },
];

function GlobeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.45 3.35 5.45 3.35 9S14.2 18.55 12 21c-2.2-2.45-3.35-5.45-3.35-9S9.8 5.45 12 3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const selectedLanguage =
    languages.find((item) => item.value === language) ?? languages[0];

  return (
    <Menu.Root positioning={{ placement: "bottom-end", gutter: 8 }}>
      <Menu.Trigger asChild>
        <Button
          aria-label={`${t("common.language")}: ${t(`languages.${language}`)}`}
          bg="transparent"
          border="none"
          borderRadius="md"
          color="var(--apple-secondary)"
          h="44px"
          minW={{ base: "44px", sm: "auto" }}
          px={{ base: 0, sm: 1.5 }}
          transition="all 0.2s ease"
          variant="ghost"
          _hover={{
            bg: "transparent",
            color: "var(--apple-blue)",
            transform: "scale(1.02)",
          }}
          _open={{
            bg: "transparent",
            color: "var(--apple-blue)",
            transform: "scale(1.02)",
          }}
          _focusVisible={{ boxShadow: "var(--focus-ring)" }}
        >
          <Flex align="center" gap={2}>
            <Flex
              align="center"
              bg="var(--apple-blue-soft)"
              borderRadius="md"
              color="var(--apple-blue)"
              flexShrink={0}
              h="30px"
              justify="center"
              w="30px"
            >
              <GlobeIcon />
            </Flex>

            <Box display={{ base: "none", sm: "block" }} textAlign="start">
              <Text
                color="var(--apple-muted)"
                fontSize="10px"
                fontWeight="700"
                lineHeight="1"
                mb={1}
              >
                {t("common.language").toUpperCase()}
              </Text>
              <Text
                color="var(--apple-text)"
                fontSize="sm"
                fontWeight="700"
                lineHeight="1"
                whiteSpace="nowrap"
              >
                {t(`languages.${language}`)}
              </Text>
            </Box>
          </Flex>
        </Button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg="var(--apple-surface-raised)"
            borderColor="var(--apple-border)"
            borderRadius="md"
            borderWidth="1px"
            boxShadow="0 20px 45px var(--apple-border)"
            backdropFilter="blur(20px) saturate(180%)"
            minW="240px"
            p={2}
          >
            <Box px={2.5} pb={2} pt={1.5}>
              <Text color="var(--apple-text)" fontSize="sm" fontWeight="800">
                {t("common.language")}
              </Text>
              <Text color="var(--apple-muted)" fontSize="xs" mt={0.5}>
                {selectedLanguage.shortLabel} / {selectedLanguage.direction}
              </Text>
            </Box>

            <Menu.Separator borderColor="var(--apple-border-soft)" mb={1.5} />

            <Menu.RadioItemGroup
              value={language}
              onValueChange={(event) => setLanguage(event.value as Language)}
            >
              {languages.map((item) => {
                const isSelected = item.value === language;

                return (
                  <Menu.RadioItem
                    key={item.value}
                    borderRadius="md"
                    cursor="pointer"
                    gap={3}
                    minH="54px"
                    px={2.5}
                    value={item.value}
                    _highlighted={{ bg: "var(--apple-blue-soft)" }}
                  >
                    <Flex
                      align="center"
                      bg={isSelected ? "var(--apple-text)" : "var(--apple-surface-hover)"}
                      borderRadius="md"
                      color={isSelected ? "var(--apple-surface)" : "var(--apple-muted)"}
                      flexShrink={0}
                      fontSize="xs"
                      fontWeight="800"
                      h="34px"
                      justify="center"
                      letterSpacing="0"
                      w="38px"
                    >
                      {item.shortLabel}
                    </Flex>

                    <Box flex="1">
                      <Text color="var(--apple-text)" fontSize="sm" fontWeight="700">
                        {t(`languages.${item.value}`)}
                      </Text>
                      <Text color="var(--apple-muted)" fontSize="xs" mt={0.5}>
                        {item.shortLabel} / {item.direction}
                      </Text>
                    </Box>

                    <Flex
                      align="center"
                      bg={isSelected ? "var(--apple-blue)" : "transparent"}
                      borderColor={isSelected ? "var(--apple-blue)" : "var(--apple-border)"}
                      borderRadius="full"
                      borderWidth="1px"
                      color="var(--apple-surface)"
                      flexShrink={0}
                      h="22px"
                      justify="center"
                      w="22px"
                    >
                      {isSelected && <CheckIcon />}
                    </Flex>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
