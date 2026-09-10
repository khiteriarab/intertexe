import { SERIF } from "./platform-ui";

const QUOTES = [
  {
    quote:
      "INTERTEXE gives us one place to normalize materials, surface gaps, and see readiness before we publish — without rebuilding data per channel.",
    name: "Material intelligence lead",
    role: "Illustrative pilot feedback · fashion brand",
  },
  {
    quote:
      "The benchmark view changed how we talk about fiber strategy — peer medians, not guesswork, from governed datasets we can actually trust.",
    name: "Sustainability director",
    role: "Illustrative pilot feedback · ready-to-wear",
  },
] as const;

export function PlatformTestimonials() {
  return (
    <section className="bg-[#faf9f7] border-y border-[#e8e3da]/60 py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <p className="text-center text-[10px] tracking-[0.24em] uppercase text-[#9c7b8b] mb-10">
          Why brands keep INTERTEXE
        </p>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          {QUOTES.map((item) => (
            <blockquote
              key={item.name}
              className="bg-white rounded-2xl border border-[#e8e3da]/80 p-8 sm:p-10 shadow-[0_20px_50px_rgba(22,21,19,0.04)]"
            >
              <p className="text-lg sm:text-xl font-light leading-relaxed text-[#161513] mb-6" style={SERIF}>
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer>
                <p className="text-sm font-medium text-[#161513]">{item.name}</p>
                <p className="text-xs text-[#9c9488] mt-1">{item.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
