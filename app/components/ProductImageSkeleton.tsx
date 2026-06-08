export default function ProductImageSkeleton() {
  return (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-[#1C2B2A]">
      <div className="flex items-baseline gap-0 select-none opacity-30">
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "11px",
            fontWeight: 400,
            letterSpacing: "0.25em",
            color: "#FFFFFF",
          }}
        >
          INTER
        </span>
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.25em",
            color: "#FFFFFF",
          }}
        >
          TEXE
        </span>
      </div>
    </div>
  );
}
