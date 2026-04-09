import type { Metadata } from "next";
import { Navbar } from "@/app/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Autoguessr — Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <div className="glass-panel rounded-xl p-8 sm:p-12 space-y-8 text-sm leading-relaxed text-foreground/80">

            <div className="space-y-2">
              <h1 className="text-3xl normal-case tracking-normal font-display font-black text-white">
                Privacy Policy
              </h1>
              <p className="text-muted-foreground text-xs">
                Effective Date: April 7, 2025 &mdash; {" "}
                <a href="mailto:kpallin90@gmail.com" className="text-primary hover:underline">
                  Contact us
                </a>.
              </p>
            </div>

            <Section title="1. Introduction">
              <p>
                This Privacy Policy explains how AutoGuessr (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or
                &ldquo;the Service&rdquo;) collects, uses, stores, and protects information about users
                (&ldquo;you&rdquo;). We are committed to compliance with applicable privacy laws, including
                Canada&apos;s Personal Information Protection and Electronic Documents Act (PIPEDA) and,
                where applicable, the General Data Protection Regulation (GDPR).
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <h3 className="text-white font-semibold normal-case tracking-normal text-sm mb-2">
                2.1 Information You Provide
              </h3>
              <ul>
                <li>
                  Leaderboard display name: the name you choose when submitting a score. This is visible to
                  all users.
                </li>
                <li>
                  Account data (if applicable): email address and password if account creation is
                  introduced in the future.
                </li>
                <li>
                  User-submitted images (future feature): photographs you upload, along with any associated
                  metadata.
                </li>
                <li>Communications: messages or feedback you send to us.</li>
              </ul>
              <h3 className="text-white font-semibold normal-case tracking-normal text-sm mt-4 mb-2">
                2.2 Information Collected Automatically
              </h3>
              <ul>
                <li>Log data: IP address, browser type, device type, and pages visited.</li>
                <li>
                  Usage and gameplay data: game sessions, scores, answer times, and feature interactions.
                </li>
                <li>Cookies and similar technologies (see Section 5).</li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use information we collect to:</p>
              <ul>
                <li>Operate and display the leaderboard.</li>
                <li>Present game content and track scores.</li>
                <li>Improve game performance, content, and user experience.</li>
                <li>Moderate user-submitted content (future feature).</li>
                <li>Respond to inquiries and support requests.</li>
                <li>Comply with legal obligations.</li>
              </ul>
              <p>We do not sell your personal information to third parties.</p>
            </Section>

            <Section title="4. Legal Basis for Processing (GDPR)">
              <p>
                If you are located in the European Economic Area, our legal bases for processing personal
                data include:
              </p>
              <ul>
                <li>
                  <strong className="text-white">Contract:</strong> processing necessary to deliver the
                  game experience you have requested.
                </li>
                <li>
                  <strong className="text-white">Legitimate interests:</strong> maintaining the leaderboard,
                  detecting cheating, and improving the Service.
                </li>
                <li>
                  <strong className="text-white">Legal obligation:</strong> compliance with applicable laws.
                </li>
                <li>
                  <strong className="text-white">Consent:</strong> where explicitly provided (e.g., image
                  submission).
                </li>
              </ul>
            </Section>

            <Section title="5. Cookies">
              <p>
                AutoGuessr uses cookies and similar technologies to maintain sessions, save game state, and
                analyse usage patterns. You may control cookie preferences through your browser settings;
                however, doing so may affect certain game features.
              </p>
            </Section>

            <Section title="6. Leaderboard and Public Data">
              <p>
                Your chosen display name and score are stored in our leaderboard database and are publicly
                visible to all users of the Service. Please choose a display name that does not include
                personal information you do not wish to disclose publicly.
              </p>
            </Section>

            <Section title="7. User-Submitted Images (Future Feature)">
              <p>
                If you submit images to AutoGuessr in the future, those images may be displayed publicly as
                part of the game. We will store submitted images and associated metadata for as long as they
                remain in the game library. You may request removal of a submitted image at any time by
                contacting us at{" "}
                <a href="mailto:kpallin90@gmail.com" className="text-primary hover:underline">
                  contact us
                </a>
                . We will process removal requests within 14 business days.
              </p>
            </Section>

            <Section title="8. Data Retention">
              <p>
                We retain leaderboard data indefinitely to maintain a consistent game record. Account data
                (if applicable) is retained for as long as your account is active. You may request deletion
                of your personal data by{" "}
                <a href="mailto:kpallin90@gmail.com" className="text-primary hover:underline">
                  contacting us
                </a>
                . We will respond within 30 days, subject to any legal retention obligations.
              </p>
            </Section>

            <Section title="9. Data Sharing">
              <p>We do not sell personal data. We may share data with:</p>
              <ul>
                <li>
                  Cloud hosting and infrastructure providers who process data on our behalf under
                  appropriate agreements.
                </li>
                <li>Law enforcement or regulators where required by applicable law.</li>
              </ul>
            </Section>

            <Section title="10. Security">
              <p>
                We implement reasonable technical and organisational measures to protect user data. No
                method of internet transmission is completely secure, and we cannot guarantee absolute
                security.
              </p>
            </Section>

            <Section title="11. Your Rights">
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul>
                <li>Access the personal data we hold about you.</li>
                <li>Correct inaccurate data.</li>
                <li>Request deletion of your data.</li>
                <li>Object to or request restriction of processing.</li>
                <li>Withdraw consent where processing is based on consent.</li>
                <li>Data portability (GDPR).</li>
              </ul>
              <p>
                To exercise any of these rights, {" "}
                <a href="mailto:kpallin90@gmail.com" className="text-primary hover:underline">
                  contact us
                </a>
                .
              </p>
            </Section>

            <Section title="12. Children's Privacy">
              <p>
                AutoGuessr is not directed at children under the age of 13. We do not knowingly collect
                personal information from children. If you believe a child has provided personal information
                through the Service, please contact us and we will delete it promptly.
              </p>
            </Section>

            <Section title="13. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. The effective date at the top of this
                document will reflect the date of the most recent revision. Continued use of the Service
                following any update constitutes acceptance of the revised Policy.
              </p>
            </Section>

            <Section title="14. Contact">
              <p>
                For privacy-related inquiries or to exercise your rights, {" "}
                <a href="mailto:kpallin90@gmail.com" className="text-primary hover:underline">
                  contact us
                </a>.
              </p>
            </Section>

          </div>
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-display font-bold text-white normal-case tracking-normal border-b border-white/10 pb-2">
        {title}
      </h2>
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-foreground/70">
        {children}
      </div>
    </section>
  );
}
