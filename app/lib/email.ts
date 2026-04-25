// Email helpers for admin notifications via Resend.
import { Resend } from "resend";

export async function sendDailyChallengeReviewEmail(
  challenges: { challengeNumber: number; date: string }[]
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey) {
    console.warn("[email] Skipping email: RESEND_API_KEY is not set");
    return;
  }

  if (!adminEmail) {
    console.warn("[email] Skipping email: ADMIN_EMAIL is not set");
    return;
  }

  const resend = new Resend(apiKey);

  const list = challenges
    .map((c) => `  #${c.challengeNumber} — ${c.date}`)
    .join("\n");

  await resend.emails.send({
    from: "AutoGuessr <noreply@autoguessr.com>",
    to: adminEmail,
    subject: `AutoGuessr: ${challenges.length} daily challenge(s) ready for review`,
    text: `The following daily challenges have been generated and are awaiting review:\n\n${list}\n\nReview and publish them in the admin panel before their scheduled dates.`,
  });
}
