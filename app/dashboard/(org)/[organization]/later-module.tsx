import { HqPageHeader } from "../../components/HqUi";

export function LaterModulePage({ title }: { title: string }) {
  return (
    <div>
      <HqPageHeader
        title={title}
        description="Not included in this controlled first pilot."
      />
      <div className="bg-white border border-black/10 rounded-xl p-5 max-w-2xl">
        <p className="text-sm text-black/70">
          This module is unavailable for now. It is listed for INTERTEXE staff so the later
          roadmap stays visible without presenting unfinished product as working.
        </p>
        <p className="text-sm text-black/55 mt-3">
          Pilot workflow: upload a catalog → map columns → confirm import → resolve issues →
          review fields → publish a passport.
        </p>
      </div>
    </div>
  );
}
