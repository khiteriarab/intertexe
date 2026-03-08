"use client";

import Link from "next/link";

export default function QuizClient() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 text-center">
      <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mb-4">
        Discover Your Style
      </span>
      <h1 className="text-3xl md:text-5xl font-serif mb-4" data-testid="text-quiz-title">
        Find Your Fabric Persona
      </h1>
      <p className="text-muted-foreground text-sm md:text-base max-w-md mb-8 leading-relaxed">
        Answer a few questions about your style preferences and we&apos;ll match you with your ideal fabric persona and designer recommendations.
      </p>
      <p className="text-xs text-muted-foreground">
        Quiz functionality coming soon to the new platform.
      </p>
    </div>
  );
}
