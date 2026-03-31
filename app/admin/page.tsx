import type { Metadata } from "next";
import AdminPanel from "./_components/AdminPanel";

export const metadata: Metadata = {
  title: "Admin — Autoguessr",
};

export default function AdminPage() {
  return <AdminPanel />;
}
