// Kept separate from lib/media.ts (which imports Prisma) so this constant
// stays safe to import from client components — e.g. MediaUploadForm.tsx.

// Event media (photos/videos) is streamed straight to disk (see
// app/api/admin/events/[id]/media/route.ts), so this is a disk-space/abuse
// guard, not a memory constraint — safe to set generously high.
export const MAX_MEDIA_UPLOAD_BYTES = 8 * 1024 * 1024 * 1024; // 8GB
