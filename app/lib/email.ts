// Email utilities for sending review notifications.

interface DailyChallenge {
  challengeNumber: number;
  date: string;
}

export async function sendDailyChallengeReviewEmail(
  challenges: DailyChallenge[]
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("[email] ADMIN_EMAIL not configured, skipping email");
    return;
  }

  const body = `
The following daily challenges were generated and are ready for review:

${challenges.map((c) => `- Challenge #${c.challengeNumber} (${c.date})`).join("\n")}

Review them here: ${process.env.NEXT_PUBLIC_BASE_URL ?? "https://autoguessr.com"}/admin/daily-challenges
  `.trim();

  // Log for now; can integrate with email service (SendGrid, Resend, etc.)
  console.log(`[email] Would send to ${adminEmail}:\n${body}`);
}
