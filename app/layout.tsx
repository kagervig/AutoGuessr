import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Autoguessr",
  description: "Can you identify the car?",
  openGraph: {
    title: "Autoguessr",
    description: "Can you identify the car?",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Autoguessr" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Autoguessr",
    description: "Can you identify the car?",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
