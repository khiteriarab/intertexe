"use client";

import dynamic from "next/dynamic";

const HomePageContent = dynamic(
  () => import("./HomeClient").then((m) => ({ default: m.HomePageContent })),
  { ssr: false }
);

export default function HomeWrapper() {
  return <HomePageContent />;
}
