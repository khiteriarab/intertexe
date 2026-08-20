import type { Metadata } from "next";
import { PlatformChrome } from "./PlatformChrome";
import { PlatformHome } from "./PlatformHome";
import { PlatformViewTracker } from "./PlatformViewTracker";

export const metadata: Metadata = {
  title: "Material intelligence for fashion",
  description:
    "Give INTERTEXE your product catalog. We'll turn your material data into an intelligent, structured system that shows you what's in your products, what's wrong or missing, how your material strategy compares with the market, and what you need to do next. When you're ready, that same data becomes your Digital Product Passports.",
};

export default function PlatformPage() {
  return (
    <PlatformChrome active="platform">
      <PlatformViewTracker event="platform_view" />
      <PlatformHome />
    </PlatformChrome>
  );
}
