import { config } from "@fortawesome/fontawesome-svg-core";

// We import the CSS ourselves (app/layout.tsx) and render icons as inline
// SVG via React components, so the library shouldn't also inject its own
// <style> tag — that would fight Next's CSS ordering and cause a flash of
// unstyled (giant) icons on first paint.
config.autoAddCss = false;
