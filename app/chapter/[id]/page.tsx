import { notFound } from "next/navigation";
import { getChapterById, getSeriesById, listChapters } from "@/lib/db";
import { ChapterReader } from "@/components/ChapterReader";
import { estimatedReadMinutes } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapter = await getChapterById(id);
  if (!chapter) notFound();
  const series = await getSeriesById(chapter.series_id);
  if (!series) notFound();

  // Find the next chapter for seamless binge reading.
  const chapters = await listChapters(series.id);
  const idx = chapters.findIndex((c) => c.id === id);
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;

  return (
    <ChapterReader
      chapterId={chapter.id}
      title={chapter.title ?? `Chapter ${chapter.chapter_number}`}
      seriesTitle={series.title}
      seriesId={series.id}
      contentType={chapter.content_type}
      content={chapter.content ?? ""}
      price={Number(chapter.current_price_usdc)}
      estReadMin={estimatedReadMinutes(chapter.word_count)}
      nextChapterId={next?.id ?? null}
    />
  );
}
