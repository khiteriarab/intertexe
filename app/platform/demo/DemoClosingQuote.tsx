import { SERIF } from "../platform-ui";

export function DemoClosingQuote() {
  return (
    <section className="demo-editorial-quote border-t border-[var(--platform-border)]/70">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-16 sm:py-20 lg:py-24 text-center">
        <blockquote className="m-0">
          <p className="text-[2rem] sm:text-[2.75rem] lg:text-[3rem] font-light italic text-[var(--platform-ink)]" style={SERIF}>
            “Data that moves fashion forward.”
          </p>
        </blockquote>
      </div>
    </section>
  );
}
