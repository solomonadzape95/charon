import { notFound, redirect } from "next/navigation";
import { getChapterById, getSeriesById } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Legacy chapter URL. Chapters are now read at the clean slug-based route
 * /series/<slug>/<n>; this resolves the old UUID link and redirects there so
 * stored links (bookmarks, history) keep working.
 */
export default async function ChapterRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapter = await getChapterById(id);
  if (!chapter) notFound();
  const series = await getSeriesById(chapter.series_id);
  if (!series) notFound();
  redirect(`/series/${series.slug ?? series.id}/${chapter.chapter_number}`);
}
