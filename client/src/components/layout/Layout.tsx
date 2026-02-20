import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto px-4 md:px-8 pb-20 md:pb-0">
        {children}
      </main>
      <Footer />
    </div>
  );
}
