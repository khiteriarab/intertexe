import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "INTERTEXE Dashboard",
    template: "%s · INTERTEXE Dashboard",
  },
  robots: { index: false, follow: false },
};

export default function HqRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
