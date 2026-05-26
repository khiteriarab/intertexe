import { FIBER_EDUCATION } from "../../lib/fiber-education";

export function FiberEducationSection({ slug }: { slug: string }) {
  const fiber = FIBER_EDUCATION[slug];
  if (!fiber) return null;

  return (
    <div className="border-t border-border/30 mt-16 pt-12 max-w-2xl" data-testid={`fiber-education-${slug}`}>
      <p className="text-[10px] tracking-[0.2em] text-muted-foreground mb-6 uppercase">THE MATERIAL</p>
      <h2
        className="text-2xl font-serif font-light mb-4 text-foreground"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {fiber.title}
      </h2>
      <div className="space-y-4 text-sm text-foreground/75 leading-relaxed">
        {fiber.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
