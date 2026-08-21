export type { FiberFact } from "./weekly-edit-season";
import { resolveWeeklyEditEditorial, type FiberFact } from "./weekly-edit-season";

export function getFiberFactForWeek(weekNumber: number): FiberFact {
  return resolveWeeklyEditEditorial(weekNumber).fiberFact;
}
