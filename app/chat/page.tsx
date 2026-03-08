import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Material Advisor",
  description: "Chat with our AI material advisor for personalized fabric recommendations, care tips, and shopping guidance.",
  alternates: { canonical: "https://www.intertexe.com/chat" },
};

export default function ChatPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 text-center">
      <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mb-4">
        AI Advisor
      </span>
      <h1 className="text-3xl md:text-5xl font-serif mb-4" data-testid="text-chat-title">
        Material Advisor
      </h1>
      <p className="text-muted-foreground text-sm md:text-base max-w-md mb-8 leading-relaxed">
        Get personalized fabric recommendations and care tips from our AI material expert.
      </p>
      <p className="text-xs text-muted-foreground">
        Chat functionality coming soon to the new platform.
      </p>
    </div>
  );
}
