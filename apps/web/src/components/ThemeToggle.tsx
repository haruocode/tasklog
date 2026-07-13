import { useState } from "react";
import { applyTheme, type Theme } from "../lib/theme";

// Fixed toggle rendered once (see main.tsx); initial value comes from the
// data-theme attribute set by the inline script in index.html.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(
    () =>
      (document.documentElement.getAttribute("data-theme") as Theme) ?? "light",
  );

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      title={theme === "dark" ? "ライトモード" : "ダークモード"}
      className="fixed right-3 top-3 z-50 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
