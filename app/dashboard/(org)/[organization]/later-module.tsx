import { EntPageHeader, EntSurface } from "../../components/EnterpriseUi";

export function LaterModulePage({ title }: { title: string }) {
  return (
    <div>
      <EntPageHeader
        title={title}
        description="Not included in this controlled first pilot."
      />
      <EntSurface padding="large" className="max-w-2xl">
        <p className="text-sm leading-relaxed text-[var(--ent-ink-soft)]">
          This module is unavailable for now. It is listed for INTERTEXE staff so the later
          roadmap stays visible without presenting unfinished product as working.
        </p>
        <p className="text-sm leading-relaxed text-[var(--ent-muted)] mt-4">
          Pilot workflow: upload a catalog → map columns → confirm import → resolve issues →
          review fields → publish a passport.
        </p>
      </EntSurface>
    </div>
  );
}
