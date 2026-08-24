import type { EventMedia } from "@prisma/client";

export default function MediaGallery({ media }: { media: EventMedia[] }) {
  if (media.length === 0) return null;

  return (
    <div className="mt-12 border-t border-white/10 pt-10">
      <h2 className="font-display mb-6 text-xl font-medium text-white">Media</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.map((item) =>
          item.type === "VIDEO" ? (
            <video
              key={item.id}
              className="aspect-square w-full rounded-lg object-cover"
              src={`/api/media/${item.filePath}`}
              controls
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media, not a static asset
            <img
              key={item.id}
              src={`/api/media/${item.filePath}`}
              alt={item.caption ?? ""}
              className="aspect-square w-full rounded-lg object-cover"
            />
          ),
        )}
      </div>
    </div>
  );
}
