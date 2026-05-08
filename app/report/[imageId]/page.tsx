// Report page — lets users flag a problem with a game image.
import type { Metadata } from "next";
import ReportForm from "./ReportForm";

export const metadata: Metadata = {
  title: "Report an Image — Autoguessr",
};

interface Props {
  params: Promise<{ imageId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { imageId } = await params;
  const { returnTo } = await searchParams;
  return <ReportForm imageId={imageId} returnTo={returnTo} />;
}
