// Shared dark-mode preference handling: 'light' | 'dark' | 'system'.
// Ported from cflow's public/js/theme.js — same localStorage key and
// class-toggle mechanism, so behavior stays identical across both apps.
export const THEME_STORAGE_KEY = "themePreference";

export type ThemePreference = "light" | "dark" | "system";

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable — fall back to system.
  }
  return "system";
}

export function applyThemePreference(pref: ThemePreference): void {
  const isDark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export const THEME_CHANGE_EVENT = "themepreferencechange";

export function setThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore — falls back to in-memory only for this page load
  }
  applyThemePreference(pref);
  // The native `storage` event only fires in *other* tabs, not this one —
  // dispatch our own so same-tab subscribers (useSyncExternalStore in
  // ThemeToggle) re-read the new value too.
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

// Source for the render-blocking inline script (app/layout.tsx) that
// applies the class before first paint, avoiding a flash of the wrong
// theme. Must stay dependency-free and inlined as a string, since it runs
// before any bundled JS.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var pref = localStorage.getItem('${THEME_STORAGE_KEY}') || 'system';
    var isDark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.backgroundColor = isDark ? '#09090b' : '#FAFAFA';
  } catch (error) {}
})();
`;
