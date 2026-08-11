import { useCallback, useEffect, useState } from "react";

export const Theme = {
  Light: "light",
  Dark: "dark",
} as const;

export type Theme = (typeof Theme)[keyof typeof Theme];

/** Shared with the inline script in index.html — one key, one home. */
const STORAGE_KEY = "rental.theme";

function currentTheme(): Theme {
  const attribute = document.documentElement.dataset["theme"];
  return attribute === Theme.Dark ? Theme.Dark : Theme.Light;
}

/**
 * Reads the theme the inline boot script already applied, rather than deciding
 * again — deciding twice is how a flash of the wrong theme gets reintroduced.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset["theme"] = theme;
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private browsing can refuse storage. The theme still applies for this
      // session; only the preference is lost, which is not worth failing over.
    }
  }, [theme]);

  // Enable colour transitions only after the first paint, so the initial render
  // doesn't animate in from the default palette.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-ready");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === Theme.Dark ? Theme.Light : Theme.Dark));
  }, []);

  return { theme, toggleTheme };
}
