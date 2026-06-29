import { notFound } from "next/navigation";
import {
  getCreatorById,
  getFollow,
  getSeriesByIdOrSlug,
  getUserByEmail,
  hasPaidForChapter,
  listChapters,
} from "@/lib/db";
import { ChapterReader } from "@/components/ChapterReader";
import { GuestGate } from "@/components/GuestGate";
import { LowBalanceGate } from "@/components/LowBalanceGate";
import { estimatedReadMinutes } from "@/lib/pricing";
import { MIN_SETTLE } from "@/lib/payments";
import { supabaseServerAuth } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** Clean, slug-based chapter URL: /series/<slug>/<chapter number>. */
export default async function ChapterPage({ params }: { params: Promise<{ id: string; chapter: string }> }) {
  const { id, chapter: chapterParam } = await params;
  const series = await getSeriesByIdOrSlug(id);
  if (!series) notFound();
  const seriesSlug = series.slug ?? series.id;

  const chapters = await listChapters(series.id);
  const n = Number(chapterParam);
  const idx = chapters.findIndex((c) => c.chapter_number === n);
  if (idx < 0) notFound();
  const chapter = chapters[idx];

  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const firstChapterId = chapters[0]?.id ?? null;

  const {
    data: { user },
  } = await (await supabaseServerAuth()).auth.getUser();
  const guest = !user;

  let owner = false;
  let alreadyPaid = false;
  let blockedNoBalance = false;
  if (user?.email) {
    const creator = await getCreatorById(series.creator_id);
    owner = !!creator?.email && creator.email.trim().toLowerCase() === user.email.trim().toLowerCase();
    if (!owner) {
      const appUser = await getUserByEmail(user.email.trim().toLowerCase());
      if (appUser) {
        alreadyPaid = await hasPaidForChapter(appUser.id, chapter.id);
        const follow = await getFollow(appUser.id, series.id);
        const free = alreadyPaid || follow?.mode === "series_unlock";
        if (!free && Number(appUser.balance_usd) < MIN_SETTLE) blockedNoBalance = true;
      }
    }
  }

  if (blockedNoBalance) {
    return (
      <LowBalanceGate seriesTitle={series.title} seriesSlug={seriesSlug} chapterTitle={chapter.title ?? `Chapter ${chapter.chapter_number}`} />
    );
  }

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
      owner={owner}
      alreadyPaid={alreadyPaid}
    />
  );
}
