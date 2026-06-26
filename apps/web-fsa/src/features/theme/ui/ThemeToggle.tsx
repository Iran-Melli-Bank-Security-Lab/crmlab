import { Box, chakra, HStack, Menu, Portal, Text } from "@chakra-ui/react";
import { useColorMode } from "@/shared/theme/colorMode";

function SunIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.75v2.1M12 19.15v2.1M21.25 12h-2.1M4.85 12h-2.1M18.54 5.46l-1.48 1.48M6.94 17.06l-1.48 1.48M18.54 18.54l-1.48-1.48M6.94 6.94 5.46 5.46"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M20.2 14.4A7.7 7.7 0 0 1 9.6 3.8 8.6 8.6 0 1 0 20.2 14.4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="m5 12.5 4.2 4.2L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ThemeIconButton() {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === "dark";

  return (
    <chakra.button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleColorMode}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      h="38px"
      w="38px"
      borderRadius="full"
      border="1px solid"
      borderColor="var(--apple-border)"
      bg="var(--apple-surface-glass)"
      color="var(--apple-secondary)"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04)"
      transition="background 140ms ease, color 140ms ease, border-color 140ms ease, transform 140ms ease"
      _hover={{
        bg: "var(--apple-blue-soft)",
        color: "var(--apple-blue)",
        transform: "translateY(-1px)",
      }}
      _focusVisible={{ boxShadow: "var(--focus-ring)" }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </chakra.button>
  );
}

export function ThemeMenuItems() {
  const { colorMode, setColorMode } = useColorMode();
  const options = [
    { label: "Light", value: "light" as const, icon: <SunIcon /> },
    { label: "Dark", value: "dark" as const, icon: <MoonIcon /> },
  ];

  return (
    <>
      <Menu.Separator borderColor="var(--apple-border-soft)" my={1.5} />
      <Box px={2.5} py={1}>
        <Text color="var(--apple-muted)" fontSize="xs" fontWeight="800">
          Appearance
        </Text>
      </Box>
      {options.map((option) => {
        const selected = colorMode === option.value;

        return (
          <Menu.Item
            key={option.value}
            borderRadius="md"
            cursor="pointer"
            gap={3}
            minH="42px"
            value={`theme-${option.value}`}
            onClick={() => setColorMode(option.value)}
            _highlighted={{ bg: "var(--apple-blue-soft)", color: "var(--apple-blue)" }}
          >
            <HStack color={selected ? "var(--apple-blue)" : "var(--apple-muted)"} w="24px">
              {option.icon}
            </HStack>
            <Text flex="1" fontSize="sm" fontWeight="700">
              {option.label}
            </Text>
            {selected && (
              <Box color="var(--apple-blue)">
                <CheckIcon />
              </Box>
            )}
          </Menu.Item>
        );
      })}
    </>
  );
}

export function ThemeMenu() {
  return (
    <Menu.Root positioning={{ placement: "bottom-end", gutter: 8 }} lazyMount unmountOnExit>
      <Menu.Trigger asChild>
        <Box>
          <ThemeIconButton />
        </Box>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg="var(--apple-surface-raised)"
            borderColor="var(--apple-border)"
            borderRadius="md"
            borderWidth="1px"
            boxShadow="var(--surface-shadow)"
            backdropFilter="blur(20px) saturate(180%)"
            minW="180px"
            p={2}
          >
            <ThemeMenuItems />
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
