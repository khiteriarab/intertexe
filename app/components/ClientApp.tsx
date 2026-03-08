"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Footer } from "./Footer";

const ClientShell = dynamic(
  () => import("./ClientShell").then((m) => ({ default: m.ClientShell })),
  { ssr: false }
);

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
      <ClientShell footer={<Footer />}>{children}</ClientShell>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
