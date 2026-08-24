"use client";

import { useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon, faCircleHalfStroke } from "@fortawesome/free-solid-svg-icons";
import {
  getThemePreference,
  setThemePreference,
  THEME_CHANGE_EVENT,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof faSun }[] = [
  { value: "light", label: "Licht", icon: faSun },
  { value: "dark", label: "Donker", icon: faMoon },
  { value: "system", label: "Auto", icon: faCircleHalfStroke },
];

// getThemePreference() reads localStorage, which doesn't exist on the
// server — subscribing via useSyncExternalStore (rather than
// useState+useEffect) lets React use getServerSnapshot for SSR/hydration
// and swap in the real client value right after, with no setState-in-effect
// and no hydration-mismatch warning.
function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

export default function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, getThemePreference, getServerSnapshot);

  return (
    <div
      role="radiogroup"
      aria-label="Weergave"
      className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-zinc-800"
    >
      {OPTIONS.map((option) => {
        const active = pref === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setThemePreference(option.value)}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                : "text-slate-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <FontAwesomeIcon icon={option.icon} className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
