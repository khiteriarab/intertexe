"use client";

import { Suspense, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RouteProgress } from "./RouteProgress";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Navbar } from "./Navbar";
import { ScrollToTop } from "./ScrollToTop";
import { Analytics } from "./Analytics";
import { Footer } from "./Footer";
import { EmailBanner } from "./EmailBanner";
import { SignInBenefitsBanner } from "./SignInBenefitsBanner";
import { AuthLoginPromptProvider } from "../hooks/use-auth-login-prompt";

const B2B_ROUTE_PREFIXES = ["/platform", "/partners"];
const DOCUMENT_ROUTE_PREFIXES = ["/press-kit"];

function isB2BRoute(pathname: string) {
  return B2B_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isDocumentRoute(pathname: string) {
  return DOCUMENT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function ClientApp({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const b2b = isB2BRoute(pathname ?? "");
  const document = isDocumentRoute(pathname ?? "");
  const minimalChrome = b2b || document;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthLoginPromptProvider>
      <Analytics />
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <div
        className={`min-h-screen flex flex-col w-full max-w-[100vw] overflow-x-hidden ${
          minimalChrome ? "bg-white text-gray-900" : "bg-background text-foreground"
        }`}
      >
        {!minimalChrome && <Navbar />}
        {!minimalChrome && <SignInBenefitsBanner />}
        <main
          className={
            minimalChrome
              ? "flex-1 flex flex-col w-full max-w-full"
              : "flex-1 flex flex-col w-full max-w-full mx-auto px-4 md:px-8 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
          }
        >
          {children}
        </main>
        {!minimalChrome && <Footer />}
        {!minimalChrome && <EmailBanner />}
        {!minimalChrome && <ScrollToTop />}
      </div>
      <Toaster position="top-right" />
      </AuthLoginPromptProvider>
    </QueryClientProvider>
  );
}
