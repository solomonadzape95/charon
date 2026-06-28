import { notFound } from "next/navigation";
import { getChapterById, getSeriesById, listChapters } from "@/lib/db";
import { ChapterReader } from "@/components/ChapterReader";
import { GuestGate } from "@/components/GuestGate";
import { estimatedReadMinutes } from "@/lib/pricing";
import { supabaseServerAuth } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapter = await getChapterById(id);
  if (!chapter) notFound();
  const series = await getSeriesById(chapter.series_id);
  if (!series) notFound();

  // Find adjacent chapters for navigation.
  const chapters = await listChapters(series.id);
  const idx = chapters.findIndex((c) => c.id === id);
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const firstChapterId = chapters[0]?.id ?? null;
  const seriesSlug = series.slug ?? series.id;

  // Auth check (trusted session). Guests read only the first chapter; later
  // chapters are gated server-side so their content is never sent to the client.
  const {
    data: { user },
  } = await (await supabaseServerAuth()).auth.getUser();
  const guest = !user;

  if (guest && chapter.chapter_number > 1) {
    return (
      <GuestGate
        seriesTitle={series.title}
        seriesSlug={seriesSlug}
        n={chapter.chapter_number}
        title={chapter.title ?? `Chapter ${chapter.chapter_number}`}
        teaser={(chapter.content ?? "").replace(/\s+/g, " ").trim().slice(0, 340)}
        firstChapterId={firstChapterId}
      />
    );
  }

  return (
    <ChapterReader
      chapterId={chapter.id}
      title={chapter.title ?? `Chapter ${chapter.chapter_number}`}
      seriesTitle={series.title}
      seriesId={seriesSlug}
      contentType={chapter.content_type}
      content={chapter.content ?? ""}
      price={Number(chapter.current_price_usdc)}
      estReadMin={estimatedReadMinutes(chapter.word_count)}
      nextChapterId={next?.id ?? null}
      prevChapterId={prev?.id ?? null}
      chapterNumber={chapter.chapter_number}
      chapters={chapters.map((c) => ({
        id: c.id,
        n: c.chapter_number,
        title: c.title ?? `Chapter ${c.chapter_number}`,
      }))}
      guest={guest}
    />
  );
}
