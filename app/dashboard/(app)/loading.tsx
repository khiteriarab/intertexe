export default function HqAppLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div
        className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-[10px] tracking-[0.18em] uppercase text-black/45">INTERTEXE Dashboard</p>
        <p className="mt-3 text-sm font-medium text-black/85">Loading workspace…</p>
        <p className="mt-2 text-xs text-black/50 leading-relaxed">
          Fetching live metrics and sync status. This can take a moment.
        </p>
        <div className="mt-5 mx-auto h-1 w-40 overflow-hidden rounded-full bg-black/10">
          <div className="hq-loading-bar h-full w-1/3 rounded-full bg-black" />
        </div>
      </div>
      <style>{`
        @keyframes hqLoadingBar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        .hq-loading-bar {
          animation: hqLoadingBar 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
