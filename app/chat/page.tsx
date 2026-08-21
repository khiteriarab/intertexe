import type { Metadata } from "next";
import ChatClient from "./ChatClient";

export const metadata: Metadata = {
  title: "Material Advisor | INTERTEXE",
  description: "AI-powered fashion fabric advisor",
  alternates: { canonical: "https://www.intertexe.com/chat" },
  robots: { index: false, follow: true },
};

export default function ChatPage() {
  return <ChatClient />;
}
