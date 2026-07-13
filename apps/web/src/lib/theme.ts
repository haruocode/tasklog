export type Theme = "light" | "dark";

const STORAGE_KEY = "tasklog-theme";

// Resolves the active theme: saved preference, else OS preference.
export function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// Applies a theme to <html> and persists it. The `dark:` variant and base
// colors key off the data-theme attribute (see index.css).
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}
