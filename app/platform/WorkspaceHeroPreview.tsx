import { SERIF } from "./platform-ui";

const METRICS = [
  ["12,430", "Products"],
  ["81%", "Complete records"],
  ["487", "Issues to resolve"],
  ["62%", "Passport-ready fields"],
] as const;

const FIBERS = [
  ["Cotton", 36, "#d9cbb8"],
  ["Polyester", 28, "#8a847c"],
  ["Viscose", 13, "#c4b8a8"],
  ["Silk", 9, "#c4a574"],
  ["Wool", 8, "#9c7b8b"],
  ["Other", 6, "#ddd5cb"],
] as const;

const PEERS = [
  ["Natural fiber share", "57%", "46%"],
  ["Silk assortment", "14%", "9%"],
  ["Complete material data", "81%", "73%"],
] as const;

const ISSUES = [
  ["Composition conflict", "384"],
  ["Missing supplier information", "736"],
  ["Invalid percentage totals", "217"],
] as const;

const NAV = ["Overview", "Products", "Materials", "Issues", "Benchmark", "Passports"] as const;

export function WorkspaceHeroPreview() {
  return (
    <figure className="m-0 mt-12 sm:mt-16">
      <div className="rounded-xl border border-[#e8e3da] bg-white overflow-hidden shadow-[0_20px_50px_rgba(22,21,19,0.06)]">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#eeeae4] bg-[#faf8f5]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#ddd5cb]" />
          <span className="ml-2 text-[10px] tracking-[0.14em] uppercase text-[#8a847c]">
            INTERTEXE workspace
          </span>
        </div>
        <div className="lg:grid lg:grid-cols-[180px_1fr]">
          <aside className="hidden lg:flex flex-col justify-between border-r border-[#eeeae4] bg-[#161513] text-white px-4 py-5">
            <div>
              <p className="text-[10px] tracking-[0.18em] uppercase text-white/50 mb-5">INTERTEXE</p>
              <ul className="space-y-1">
                {NAV.map((item, index) => (
                  <li
                    key={item}
                    className={`text-[11px] tracking-[0.12em] uppercase px-2 py-2 ${
                      index === 0 ? "bg-white/10" : "text-white/60"
                    }`}
                  >
                    {item}
                    {item === "Issues" ? (
                      <span className="ml-2 text-[9px] tracking-normal normal-case bg-[#9c7b8b] px-1.5 py-0.5">
                        487
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[10px] tracking-[0.12em] uppercase text-white/40">Sample workspace</p>
          </aside>
          <div className="p-4 sm:p-6 bg-[#f7f5f1]">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {METRICS.map(([n, label]) => (
                <div key={label} className="bg-white border border-[#e8e3da] px-3 py-3">
                  <p className="text-xl sm:text-2xl font-light tabular-nums" style={SERIF}>
                    {n}
                  </p>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#8a847c] mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-3 mb-3">
              <div className="bg-white border border-[#e8e3da] p-4">
                <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">
                  Material composition
                </p>
                <div
                  className="flex h-2 overflow-hidden bg-[#ebe4da] mb-4"
                  aria-hidden="true"
                >
                  {FIBERS.map(([name, pct, color]) => (
                    <span key={name} style={{ width: `${pct}%`, background: color }} />
                  ))}
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[#5c5854]">
                  {FIBERS.map(([name, pct]) => (
                    <li key={name} className="flex justify-between gap-2">
                      <span>{name}</span>
                      <span className="tabular-nums">{pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-[#e8e3da] p-4">
                <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">
                  Your brand vs peers
                </p>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] tracking-[0.12em] uppercase text-[#8a847c]">
                      <th className="pb-2 font-medium">Metric</th>
                      <th className="pb-2 font-medium">You</th>
                      <th className="pb-2 font-medium">Peers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PEERS.map(([metric, you, peer]) => (
                      <tr key={metric} className="border-t border-[#eeeae4]">
                        <td className="py-2">{metric}</td>
                        <td className="py-2 tabular-nums" style={SERIF}>
                          {you}
                        </td>
                        <td className="py-2 tabular-nums text-[#5c5854]">{peer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white border border-[#e8e3da] p-4">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#8a847c] mb-3">Needs attention</p>
              <ul className="divide-y divide-[#eeeae4]">
                {ISSUES.map(([issue, count]) => (
                  <li key={issue} className="flex justify-between gap-3 py-2 text-sm">
                    <span>{issue}</span>
                    <span className="text-[#8a847c] tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">
        Illustrative workspace. Counts are not a live customer catalog.
      </figcaption>
    </figure>
  );
}
