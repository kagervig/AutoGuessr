import type { Metadata } from "next";
import IdentifyScreen from "./_components/IdentifyScreen";

export const metadata: Metadata = {
  title: "Identify — Autoguessr",
  description: "Help identify mystery cars",
};

export default function IdentifyPage() {
  return <IdentifyScreen />;
}
