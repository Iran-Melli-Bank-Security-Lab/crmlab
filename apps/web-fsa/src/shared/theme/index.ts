import { createSystem, defaultConfig } from "@chakra-ui/react";

const fontStack =
  "-apple-system, BlinkMacSystemFont, Inter, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', sans-serif";

export const system = createSystem(defaultConfig, {
  globalCss: {
    html: {
      bg: "enterprise.bg",
    },
    body: {
      bg: "enterprise.bg",
      color: "enterprise.text",
      fontFeatureSettings: '"cv02", "cv03", "cv04", "ss01"',
      textRendering: "optimizeLegibility",
    },
    a: {
      textDecoration: "none",
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: fontStack },
        body: { value: fontStack },
      },
      radii: {
        md: { value: "8px" },
        lg: { value: "8px" },
        xl: { value: "8px" },
        "2xl": { value: "8px" },
      },
      colors: {
        enterprise: {
          blue: { value: "#0071e3" },
        },
      },
    },
    semanticTokens: {
      colors: {
        enterprise: {
          bg: { value: { base: "#f5f5f7", _dark: "#0b0d12" } },
          surface: { value: { base: "#ffffff", _dark: "#171a21" } },
          surfaceSubtle: { value: { base: "#fbfbfd", _dark: "#11141a" } },
          border: {
            value: { base: "rgba(0, 0, 0, 0.12)", _dark: "rgba(255, 255, 255, 0.14)" },
          },
          borderSoft: {
            value: { base: "rgba(0, 0, 0, 0.08)", _dark: "rgba(255, 255, 255, 0.09)" },
          },
          text: { value: { base: "#1d1d1f", _dark: "#f5f5f7" } },
          muted: { value: { base: "#6e6e73", _dark: "#a1a1aa" } },
          secondary: { value: { base: "#424245", _dark: "#d1d5db" } },
          blueSoft: {
            value: { base: "rgba(0, 113, 227, 0.08)", _dark: "rgba(10, 132, 255, 0.16)" },
          },
          elevated: {
            value: { base: "rgba(255, 255, 255, 0.88)", _dark: "rgba(23, 26, 33, 0.86)" },
          },
        },
      },
    },
  },
});
