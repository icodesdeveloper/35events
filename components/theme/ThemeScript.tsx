import { THEME_INIT_SCRIPT } from "@/lib/theme";

// Render-blocking, dependency-free — must run before first paint to avoid
// a flash of the wrong theme. Rendered directly in <head> by app/layout.tsx.
export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
