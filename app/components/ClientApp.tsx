"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Navbar } from "./Navbar";
import { ScrollToTop } from "./ScrollToTop";
import { Analytics } from "./Analytics";
import { Footer } from "./Footer";
import { EmailBanner } from "./EmailBanner";
import { AuthLoginPromptProvider } from "../hooks/use-auth-login-prompt";

export function ClientApp({ children }: { children: ReactNode }) {
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
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </main>
        <Footer />
        <EmailBanner />
        <ScrollToTop />
      </div>
      <Toaster position="top-right" />
      </AuthLoginPromptProvider>
    </QueryClientProvider>
  );
}
