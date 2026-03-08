"use client";

import { useState, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Navbar } from "./Navbar";
import { ScrollToTop } from "./ScrollToTop";
import { Analytics } from "./Analytics";
import { Footer } from "./Footer";

export function ClientApp({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Analytics />
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-20 md:pb-0">
          {children}
        </main>
        <Footer />
        <ScrollToTop />
      </div>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
