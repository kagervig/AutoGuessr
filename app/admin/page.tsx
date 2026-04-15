import type { Metadata } from "next";
import StagingImagePanel from "./_components/StagingImagePanel";

export const metadata: Metadata = {
  title: "Admin — Autoguessr",
};

export default function AdminPage() {
  return <StagingImagePanel />;
}
