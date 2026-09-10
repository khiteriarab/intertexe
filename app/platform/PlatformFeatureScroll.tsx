import Link from "next/link";
import { SERIF } from "./platform-ui";

const FEATURES = [
  {
    id: "connect",
    kicker: "Connect",
    title: "Trace your product data",
    copy: "Improve visibility across PLM, ERP, spreadsheets and supplier files — without replacing the systems you already use.",
    image: "/platform/INTERTEXE_02_Product_Data_Journey.png",
    imageAlt: "Product data journey from supplier feeds to governed record",
    points: ["Dedicated supplier interface", "Source provenance preserved", "Conflict detection, not blind overwrite"],
  },
  {
    id: "benchmark",
    kicker: "Measure",
    title: "Benchmark your material strategy",
    copy: "Compare fiber mix, completeness and passport readiness against governed peer segments — with conversion signals that show what is working.",
    image: "/platform/ecosystem-intelligence.jpg",
    imageAlt: "Material intelligence and benchmark dashboard",
    points: ["Peer segment medians", "Category and price-tier drill-down", "Governed datasets only"],
    flip: true,
  },
  {
    id: "publish",
    kicker: "Communicate",
    title: "Publish from one record",
    copy: "Digital Product Passports, regulatory field tracking, and brand-owned product surfaces — all outputs of the same approved canonical record.",
    image: "/platform/INTERTEXE_03_Fashion_Ecosystem.png",
    imageAlt: "Fashion ecosystem from product record to passport and channels",
    points: ["QR-ready passport hosting", "Regulatory readiness tracking", "Public product experiences"],
  },
  {
    id: "ecodesign",
    kicker: "Improve",
    title: "Ecodesign with real data",
    copy: "Duplicate products, create scenarios, and simulate material changes at the product level — before you publish to passport or ecommerce.",
    image: "/platform/INTERTEXE_01_Data_Architecture.png",
    imageAlt: "Data architecture for material intelligence workspace",
    points: ["Material scenario comparison", "Impact benchmarking", "Versioned product history"],
    flip: true,
  },
] as const;

export function PlatformFeatureScroll() {
  return (
    <div className="bg-white">
      {FEATURES.map((feature, index) => (
        <section
          key={feature.id}
          className={`py-16 sm:py-20 lg:py-28 ${index > 0 ? "border-t border-[#e8e3da]/60" : ""}`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
            <div
              className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                feature.flip ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <p className="text-[10px] tracking-[0.24em] uppercase text-[#9c7b8b] mb-4">{feature.kicker}</p>
                <h2
                  className="text-[1.85rem] sm:text-[2.35rem] md:text-[2.65rem] font-light leading-[1.12] text-[#161513] mb-4"
                  style={SERIF}
                >
                  {feature.title}
                </h2>
                <p className="text-[15px] sm:text-base text-[#5c5854] font-light leading-relaxed mb-6 max-w-lg">
                  {feature.copy}
                </p>
                <ul className="space-y-2.5 mb-8">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-[#5c5854]">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#3e6268]" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/platform/demo"
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-[#152238] hover:text-[#3e6268] transition-colors"
                >
                  Explore in demo
                  <span aria-hidden>→</span>
                </Link>
              </div>

              <figure className="m-0">
                <div className="overflow-hidden rounded-2xl border border-[#e8e3da]/80 bg-[#faf9f7] shadow-[0_32px_80px_rgba(22,21,19,0.06)]">
                  <img
                    src={feature.image}
                    alt={feature.imageAlt}
                    width={1200}
                    height={800}
                    className="w-full h-auto object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              </figure>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
