/** Editorial scan result copy — aligned with iOS ScannerEditorialVerdict / ScannerEditorialFiberStory */

export type EditorialFiberEntry = { fiber: string; percent: number; isNatural: boolean };

export function editorialVerdictHeadline(naturalPercent: number): string {
  if (naturalPercent >= 95) return 'The real thing.';
  if (naturalPercent >= 80) return 'High natural content.';
  if (naturalPercent >= 60) return 'A blend.';
  if (naturalPercent >= 1) return 'Mostly synthetic.';
  return 'Composition verified.';
}

export function editorialFiberStory(
  naturalPercent: number,
  composition: string | undefined,
  fiberBreakdown: EditorialFiberEntry[]
): string {
  if (!fiberBreakdown.length) {
    const text = composition?.trim() ?? '';
    return text || editorialVerdictCopy(naturalPercent);
  }

  const sorted = [...fiberBreakdown].sort((a, b) => b.percent - a.percent);
  const naturalFibers = sorted.filter((f) => f.isNatural);
  const syntheticFibers = sorted.filter((f) => !f.isNatural);

  const label = (fiber: EditorialFiberEntry) => fiber.fiber.toLowerCase();

  if (naturalFibers.length === 1 && syntheticFibers.length === 0) {
    const fiber = naturalFibers[0];
    if (fiber.percent === 100) return `Pure ${label(fiber)}. Nothing else.`;
    return `${fiber.percent}% ${label(fiber)}.`;
  }

  if (naturalFibers.length >= 2 && syntheticFibers.length === 0) {
    return `A ${label(naturalFibers[0])} and ${label(naturalFibers[1])} blend.`;
  }

  if (naturalFibers.length > 0 && syntheticFibers.length > 0) {
    const primary = naturalFibers[0];
    const synthetic = syntheticFibers[0];
    if (synthetic.percent <= 10) {
      return `Predominantly ${label(primary)} with a touch of ${label(synthetic)}.`;
    }
    return `${primary.percent}% ${label(primary)} blended with ${synthetic.percent}% ${label(synthetic)}.`;
  }

  if (sorted[0]) {
    return `${sorted[0].percent}% ${label(sorted[0])}.`;
  }

  return composition?.trim() || '';
}

function editorialVerdictCopy(naturalPercent: number): string {
  if (naturalPercent >= 95) {
    return 'Exceptional. This piece is made from pure natural fiber. The real thing.';
  }
  if (naturalPercent >= 80) {
    return 'High quality natural fiber content. A considered choice.';
  }
  if (naturalPercent >= 60) {
    return 'A blend. Natural fiber present but not dominant.';
  }
  if (naturalPercent >= 1) {
    return 'Mostly synthetic. Natural fiber content is minimal.';
  }
  return 'Composition could not be fully verified.';
}
