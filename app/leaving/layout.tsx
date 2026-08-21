import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaving INTERTEXE",
  robots: { index: false, follow: false },
};

export default function LeavingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
