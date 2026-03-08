import type { Metadata } from "next";
import QuizClient from "./QuizClient";

export const metadata: Metadata = {
  title: "Fabric Style Quiz | INTERTEXE",
  description: "Take our 2-minute quiz to discover your fabric persona and get personalized designer recommendations based on your material preferences.",
  alternates: { canonical: "https://www.intertexe.com/quiz" },
};

export default function QuizPage() {
  return <QuizClient />;
}
