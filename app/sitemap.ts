import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await prisma.event.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/media`, changeFrequency: "weekly", priority: 0.6 },
    ...events.map((event) => ({
      url: `${SITE_URL}/events/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
