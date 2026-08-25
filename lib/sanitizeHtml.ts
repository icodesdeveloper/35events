import sanitizeHtml from "sanitize-html";

// Shared allowlist for admin-authored rich-text content — event descriptions
// and campaign mail bodies. Both come from the RichTextEditor (Tiptap
// StarterKit + Link), so this only needs to cover what that editor can
// actually produce.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "em", "u", "s", "ul", "ol", "li", "blockquote", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export function sanitizeContentHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
