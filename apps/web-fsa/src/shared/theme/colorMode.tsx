import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ColorMode = "light" | "dark";

type ColorModeContextValue = {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
  toggleColorMode: () => void;
};

const COLOR_MODE_STORAGE_KEY = "role-dashboard-color-mode";

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

function getInitialColorMode(): ColorMode {
  if (typeof globalThis.window === "undefined") return "light";

  const storedColorMode = globalThis.window.localStorage.getItem(
    COLOR_MODE_STORAGE_KEY
  );
  if (storedColorMode === "light" || storedColorMode === "dark") {
    return storedColorMode;
  }

  return globalThis.window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function syncDocumentColorMode(colorMode: ColorMode) {
  const root = globalThis.document?.documentElement;
  if (!root) return;

  root.classList.toggle("dark", colorMode === "dark");
  root.classList.toggle("light", colorMode === "light");
  root.dataset.theme = colorMode;
  root.style.colorScheme = colorMode;
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>(getInitialColorMode);

  useEffect(() => {
    syncDocumentColorMode(colorMode);
    globalThis.window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode]);

  const setColorMode = useCallback((nextColorMode: ColorMode) => {
    setColorModeState(nextColorMode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((currentColorMode) =>
      currentColorMode === "dark" ? "light" : "dark"
    );
  }, []);

  const value = useMemo(
    () => ({ colorMode, setColorMode, toggleColorMode }),
    [colorMode, setColorMode, toggleColorMode]
  );

  return (
    <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error("useColorMode must be used inside ColorModeProvider");
  }

  return context;
}
