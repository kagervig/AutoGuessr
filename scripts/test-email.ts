import "dotenv/config";
import { sendDailyChallengeReviewEmail } from "./app/lib/email";

async function testEmail() {
  console.log("Attempting to send test email...");
  
  const mockChallenges = [
    { challengeNumber: 999, date: "2026-04-26" },
    { challengeNumber: 1000, date: "2026-04-27" }
  ];

  try {
    await sendDailyChallengeReviewEmail(mockChallenges);
    console.log("✅ Success! Check your inbox (and spam folder).");
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
}

testEmail();
