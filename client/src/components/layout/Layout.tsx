import { ReactNode } from "react";
import { Navbar } from "./Navbar";

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
      <footer className="hidden md:block py-12 border-t border-border/40 mt-auto">
        <div className="container mx-auto px-4 md:px-8 text-center text-sm text-muted-foreground uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Intertexe. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
