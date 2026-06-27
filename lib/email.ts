/**
 * Claim notification emails (digest model) via Resend.
 * GUARDED: no-op if RESEND_API_KEY is unset (logs instead) so dev works offline.
 */
import { Resend } from "resend";

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY!);
  return resend;
}

const FROM = process.env.RESEND_FROM ?? "Charon <onboarding@resend.dev>";

/**
 * Send (or refresh) a creator's claim digest: "you have $X waiting, claim here".
 * One email per creator, not one per tip.
 */
export async function sendClaimEmail(args: {
  to: string;
  creatorName?: string | null;
  totalUsd: number;
  tipCount: number;
  claimUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = `You have $${args.totalUsd.toFixed(2)} in tips waiting on Charon`;
  const greeting = args.creatorName ? `Hi ${args.creatorName},` : "Hi,";
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h2 style="margin:0 0 12px">ⲭ Charon</h2>
      <p>${greeting}</p>
      <p>Readers have sent you <strong>$${args.totalUsd.toFixed(2)}</strong> across
      <strong>${args.tipCount}</strong> tip${args.tipCount === 1 ? "" : "s"} for your work.</p>
      <p>The money is being held for you. Claim it (no signup required):</p>
      <p><a href="${args.claimUrl}"
        style="display:inline-block;background:#f5c451;color:#000;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none">
        Claim your tips →</a></p>
      <p style="color:#888;font-size:13px">If you don't claim within 30 days, the funds return to the readers.</p>
    </div>`;

  if (!emailEnabled()) {
    console.log(`[charon][email disabled] would send claim to ${args.to}: ${args.claimUrl}`);
    return { sent: false, reason: "email disabled" };
  }
  try {
    await getResend().emails.send({ from: FROM, to: args.to, subject, html });
    return { sent: true };
  } catch (e) {
    console.error("[charon] sendClaimEmail failed:", (e as Error).message);
    return { sent: false, reason: (e as Error).message };
  }
}
