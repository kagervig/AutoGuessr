// Email helpers for admin notifications via Resend.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDailyChallengeReviewEmail(
  challenges: { challengeNumber: number; date: string }[]
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL env var is not set");
  }

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
