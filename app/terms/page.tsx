import type { Metadata } from "next";
import { Navbar } from "@/app/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Autoguessr — Terms of Service",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <div className="glass-panel rounded-xl p-8 sm:p-12 space-y-8 text-sm leading-relaxed text-foreground/80">

            <div className="space-y-2">
              <h1 className="text-3xl normal-case tracking-normal font-display font-black text-white">
                Terms of Service
              </h1>
              <p className="text-muted-foreground text-xs">
                Effective Date: April 7, 2025 &mdash; Contact:{" "}
                <a href="mailto:kpallin90@gmail.com" className="text-primary hover:underline">
                  contact us
                </a>.
              </p>
            </div>

            <Section title="1. Acceptance of Terms">
              <p>
                By accessing or using AutoGuessr (the &ldquo;Service&rdquo;), you agree to be bound by
                these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service.
              </p>
            </Section>

            <Section title="2. Description of Service">
              <p>
                AutoGuessr is a car identification game in which users are presented with photographs of
                vehicles and challenged to identify the make and model as quickly as possible. The Service
                includes a leaderboard that records player names and scores.
              </p>
            </Section>

            <Section title="3. User Accounts and Leaderboard">
              <p>To participate in the leaderboard, you must provide a display name. You agree that:</p>
              <ul>
                <li>Your display name will be visible to all other users of the Service.</li>
                <li>
                  You will not use a display name that is offensive, misleading, or infringes on another
                  person&apos;s rights.
                </li>
                <li>You are responsible for any activity associated with your display name.</li>
              </ul>
              <p>We reserve the right to remove or modify display names that violate these Terms.</p>
            </Section>

            <Section title="4. Acceptable Use">
              <p>You agree not to:</p>
              <ul>
                <li>Use cheating tools, bots, or automated scripts to manipulate game scores.</li>
                <li>Attempt to tamper with the leaderboard or other users&apos; data.</li>
                <li>Use the Service for any unlawful purpose.</li>
                <li>Introduce malicious code or attempt to disrupt the Service&apos;s infrastructure.</li>
                <li>Misrepresent your identity or impersonate another person.</li>
              </ul>
            </Section>

            <Section title="5. Image Content and Licencing">
              <h3 className="text-white font-semibold normal-case tracking-normal text-sm mt-4 mb-2">
                5.1 Our Image Library
              </h3>
              <p>
                AutoGuessr&apos;s current image library consists of photographs sourced from Pexels (a
                royalty-free image platform) and photographs from the developer&apos;s personal collection.
                All images have been selected in good faith on the basis of their free-to-use status.
              </p>
              <h3 className="text-white font-semibold normal-case tracking-normal text-sm mt-4 mb-2">
                5.2 User-Submitted Images (Future Feature)
              </h3>
              <p>
                AutoGuessr may in the future offer users the ability to submit their own photographs to the
                game. By submitting an image, you represent and warrant that:
              </p>
              <ul>
                <li>
                  You are the sole copyright owner of the submitted image, or have all necessary rights and
                  permissions to grant the licence below.
                </li>
                <li>
                  The image does not infringe on the copyright, privacy rights, or any other rights of any
                  third party.
                </li>
                <li>
                  You grant AutoGuessr a non-exclusive, royalty-free, worldwide, perpetual licence to
                  display, reproduce, and use the submitted image as part of the AutoGuessr website,
                  application, and game, in any current or future format or medium.
                </li>
              </ul>
              <p>AutoGuessr does not claim ownership of submitted images. You retain copyright.</p>
              <h3 className="text-white font-semibold normal-case tracking-normal text-sm mt-4 mb-2">
                5.3 Prohibited Image Content
              </h3>
              <p>You must not submit images that:</p>
              <ul>
                <li>Contain nudity, sexual content, or graphic violence.</li>
                <li>Depict identifiable individuals without their consent.</li>
                <li>Are defamatory, hateful, or otherwise unlawful.</li>
                <li>You do not have the right to license.</li>
              </ul>
            </Section>

            <Section title="6. Copyright and Takedown Requests">
              <p>
                If you believe any image displayed on AutoGuessr infringes your copyright, {" "}
                <a href="mailto:kpallin90@gmail.com" className="text-primary hover:underline">
                  contact us
                </a>{" "}
                with:
              </p>
              <ul>
                <li>Your full name and contact information.</li>
                <li>Identification of the copyrighted work you claim has been infringed.</li>
                <li>A description of the image on AutoGuessr, with sufficient detail to locate it.</li>
                <li>
                  A statement of good-faith belief that the use is not authorised by the copyright owner,
                  its agent, or the law.
                </li>
                <li>
                  A statement, made under penalty of perjury, that the information is accurate and that you
                  are the copyright owner or are authorised to act on their behalf.
                </li>
              </ul>
              <p>
                We will acknowledge your request and respond within 14 business days. Valid claims will
                result in prompt removal of the relevant image.
              </p>
            </Section>

            <Section title="7. Intellectual Property">
              <p>
                All original content, code, game mechanics, branding, and design of AutoGuessr are the
                intellectual property of the developer. You are granted a limited, non-exclusive,
                non-transferable licence to use the Service for personal, non-commercial entertainment
                purposes.
              </p>
            </Section>

            <Section title="8. Disclaimers">
              <p className="uppercase text-xs tracking-wide text-foreground/60">
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
                warranties of any kind. We do not warrant that the Service will be uninterrupted or
                error-free. Scores and leaderboard positions are provided for entertainment purposes and
                carry no monetary or prize value unless explicitly stated otherwise.
              </p>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>
                To the fullest extent permitted by applicable law, the developer of AutoGuessr shall not
                be liable for any indirect, incidental, special, or consequential damages arising out of or
                related to your use of the Service.
              </p>
            </Section>

            <Section title="10. Changes to the Service and Terms">
              <p>
                We reserve the right to modify or discontinue the Service at any time. We may update these
                Terms from time to time. Continued use of the Service after changes are posted constitutes
                acceptance of the revised Terms.
              </p>
            </Section>

            <Section title="11. Governing Law">
              <p>
                These Terms are governed by and construed in accordance with the laws of the Province of
                Ontario, Canada, without regard to its conflict of law principles.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                For questions about these Terms, {" "}
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
