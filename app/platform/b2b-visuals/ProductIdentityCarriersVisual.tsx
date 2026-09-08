"use client";

import { useEffect, useState, type RefObject } from "react";
import { useInView, useReducedMotion } from "../b2b-motion";
import { SERIF } from "../platform-ui";

type CarrierId = "qr" | "nfc" | "rfid";

const CARRIERS: ReadonlyArray<{
  id: CarrierId;
  label: string;
  detail: string;
  tone: "primary" | "compatible";
}> = [
  { id: "qr", label: "QR", detail: "Primary · V1", tone: "primary" },
  { id: "nfc", label: "NFC", detail: "Compatible", tone: "compatible" },
  { id: "rfid", label: "RFID", detail: "Compatible", tone: "compatible" },
] as const;

const ACCESS = ["Consumer", "Regulator", "Authorized partner"] as const;

const IDENTITY = "INTX-ITX-4102";

function FlowConnector({ active, vertical = true }: { active: boolean; vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="flex flex-col items-center py-1" aria-hidden>
        <div className="w-px h-6 bg-[#e8e3da] overflow-hidden">
          <span
            className={`block w-full h-full bg-[#3e6268]/70 origin-top ${
              active ? "b2b-pulse-vertical" : "scale-y-0 opacity-30"
            }`}
          />
        </div>
        <span className={`text-[#3e6268] text-xs my-0.5 ${active ? "opacity-100" : "opacity-35"}`}>↓</span>
        <div className="w-px h-6 bg-[#e8e3da] overflow-hidden">
          <span
            className={`block w-full h-full bg-[#3e6268]/70 origin-top ${
              active ? "b2b-pulse-vertical" : "scale-y-0 opacity-30"
            }`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center justify-center px-2 self-stretch" aria-hidden>
      <div className="h-px w-8 bg-[#e8e3da] overflow-hidden">
        <span className={`block h-full w-full bg-[#3e6268]/70 origin-left ${active ? "b2b-pulse-line" : "scale-x-0 opacity-30"}`} />
      </div>
      <span className={`text-[#3e6268] mx-1 text-xs ${active ? "opacity-100" : "opacity-35"}`}>→</span>
    </div>
  );
}

function CarrierIcon({ id, active }: { id: CarrierId; active: boolean }) {
  const stroke = active ? "#3e6268" : "#8a847c";
  const common = { width: 28, height: 28, fill: "none", stroke, strokeWidth: 1.4, "aria-hidden": true as const };

  if (id === "qr") {
    return (
      <svg {...common} viewBox="0 0 28 28">
        <rect x="4" y="4" width="9" height="9" rx="1" />
        <rect x="15" y="4" width="9" height="9" rx="1" />
        <rect x="4" y="15" width="9" height="9" rx="1" />
        <path d="M17 17h2v2h-2zM21 17h3v3h-3zM17 21h2v3h-2zM21 24h3v0" />
      </svg>
    );
  }
  if (id === "nfc") {
    return (
      <svg {...common} viewBox="0 0 28 28">
        <path d="M8 18c0-5.5 4.5-10 10-10" />
        <path d="M8 14c0-3.3 2.7-6 6-6" />
        <path d="M8 10c0-1.1.9-2 2-2" />
        <rect x="5" y="19" width="18" height="4" rx="1" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 28 28">
      <path d="M6 8h16v12H6z" />
      <path d="M10 12h8M10 16h5" />
      <path d="M20 6v16" strokeDasharray="2 2" />
    </svg>
  );
}

function PassportPanel({ version, active }: { version: 1 | 2; active: boolean }) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 transition-all duration-500 ${
        active ? "border-[#3e6268]/40 shadow-sm" : "border-[#e8e3da] opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#9c7b8b] mb-1">Hosted digital passport</p>
          <p className="text-base font-light text-[#161513]" style={SERIF}>
            Silk Evening Dress
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] border border-[#3e6268]/30 text-[#152238] px-2 py-1">
          v{version}
        </span>
      </div>
      <dl className="space-y-2 text-xs text-[#5c5854]">
        <div className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2">
          <dt>Identity</dt>
          <dd className="font-mono text-[#152238]">{IDENTITY}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2">
          <dt>Composition</dt>
          <dd className="text-right">{version === 1 ? "92% Silk · 8% Elastane" : "92% Silk · 8% Elastane · verified"}</dd>
        </div>
        {version === 2 ? (
          <div className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2 b2b-fade-in">
            <dt>Manufacturing</dt>
            <dd>Portugal</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 border-t border-[#eeeae4] pt-2">
          <dt>Resolver</dt>
          <dd className="font-mono text-[10px] text-right">intertexe.com/p/{IDENTITY.toLowerCase()}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ProductIdentityCarriersVisual({ className = "" }: { className?: string }) {
  const [ref, inView] = useInView(0.2);
  const reduced = useReducedMotion();
  const [carrier, setCarrier] = useState<CarrierId>("qr");
  const [version, setVersion] = useState<1 | 2>(2);
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    if (!inView || reduced) {
      setSequence(3);
      return;
    }
    setSequence(0);
    const timers = [
      window.setTimeout(() => setSequence(1), 400),
      window.setTimeout(() => setSequence(2), 900),
      window.setTimeout(() => setSequence(3), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView, reduced]);

  const recordActive = sequence >= 0;
  const identityActive = sequence >= 1;
  const carrierActive = sequence >= 2;
  const passportActive = sequence >= 3;

  return (
    <figure ref={ref as RefObject<HTMLElement>} className={`m-0 ${className}`}>
      <div className="rounded-xl border border-[#e8e3da] bg-[#f7f5f1] overflow-hidden shadow-[0_20px_50px_rgba(22,21,19,0.05)]">
        <div className="p-4 sm:p-6 lg:p-7">
          <div
            className="max-w-md lg:max-w-none mx-auto"
            aria-label="Product identity flow: governed record to persistent identity, data carriers, hosted passport, and public access"
          >
            {/* Governed record */}
            <div
              className={`rounded-lg border bg-white p-4 transition-all duration-500 ${
                recordActive ? "border-[#3e6268]/35" : "border-[#e8e3da] opacity-50"
              }`}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#9c7b8b] mb-1">Governed product record</p>
              <p className="text-sm text-[#161513] mb-2" style={SERIF}>
                Silk Evening Dress · approved
              </p>
              <p className="text-xs text-[#5c5854]">92% Silk · 8% Elastane · source values preserved</p>
            </div>

            <FlowConnector active={identityActive} />

            {/* Persistent identity — not the QR */}
            <div
              className={`rounded-lg border p-4 transition-all duration-500 relative overflow-hidden ${
                identityActive
                  ? "border-[#152238] bg-[#152238] text-white shadow-[0_12px_32px_rgba(21,34,56,0.15)]"
                  : "border-[#e8e3da] bg-white opacity-50"
              }`}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                aria-hidden
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(-24deg, transparent, transparent 14px, rgba(255,255,255,0.08) 14px, rgba(255,255,255,0.08) 15px)",
                }}
              />
              <div className="relative">
                <p className={`text-[10px] tracking-[0.16em] uppercase mb-1 ${identityActive ? "text-white/50" : "text-[#9c7b8b]"}`}>
                  INTERTEXE product identity
                </p>
                <p className={`font-mono text-sm mb-1 ${identityActive ? "text-[#9bb4c9]" : "text-[#152238]"}`}>{IDENTITY}</p>
                <p className={`text-xs leading-relaxed ${identityActive ? "text-white/65" : "text-[#5c5854]"}`}>
                  Persistent · stable resolver · passport versions attach here
                </p>
              </div>
            </div>

            <FlowConnector active={carrierActive} />

            {/* Data carriers */}
            <div>
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#9c7b8b] mb-3 text-center lg:text-left">
                Data carrier
              </p>
              <div
                className="grid grid-cols-3 gap-2 sm:gap-3"
                role="list"
                aria-label="Select a data carrier"
              >
                {CARRIERS.map((item) => {
                  const selected = carrier === item.id;
                  const lit = carrierActive && selected;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="listitem"
                      onClick={() => setCarrier(item.id)}
                      aria-pressed={selected}
                      className={`flex flex-col items-center text-center px-2 py-3 sm:px-3 sm:py-4 border transition-all min-h-[88px] ${
                        selected
                          ? item.tone === "primary"
                            ? "bg-white border-[#3e6268]/50 shadow-sm"
                            : "bg-white border-[#3e6268]/30"
                          : "bg-white/70 border-[#e8e3da] hover:border-[#3e6268]/20 opacity-80"
                      } ${!carrierActive ? "opacity-45 pointer-events-none" : ""}`}
                    >
                      <CarrierIcon id={item.id} active={lit} />
                      <span className="text-xs font-medium text-[#152238] mt-2">{item.label}</span>
                      <span
                        className={`text-[9px] uppercase tracking-[0.08em] mt-0.5 ${
                          item.tone === "primary" ? "text-[#3e6268]" : "text-[#8a847c]"
                        }`}
                      >
                        {item.detail}
                      </span>
                      {selected && carrierActive ? (
                        <span className="mt-2 block w-full h-px bg-[#3e6268]/40 b2b-pulse-line" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-[#8a847c] leading-relaxed text-center lg:text-left">
                QR is the native V1 carrier. NFC and RFID are compatible extensions — encoding via your label partner, not INTERTEXE hardware.
              </p>
            </div>

            <FlowConnector active={passportActive} />

            {/* Hosted passport with version toggle */}
            <div className="space-y-3">
              <PassportPanel version={version} active={passportActive} />
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <p className="text-[10px] text-[#8a847c] leading-relaxed max-w-[16rem]">
                  Passport updates without changing identity.
                </p>
                <button
                  type="button"
                  onClick={() => setVersion((v) => (v === 1 ? 2 : 1))}
                  disabled={!passportActive}
                  className="text-[10px] tracking-[0.1em] uppercase border border-[#e8e3da] bg-white px-3 py-2 min-h-[36px] hover:border-[#3e6268]/30 disabled:opacity-40"
                >
                  Show passport {version === 1 ? "v2" : "v1"}
                </button>
              </div>
            </div>

            <FlowConnector active={passportActive} />

            {/* Access */}
            <div
              className={`rounded-lg border bg-white p-4 transition-opacity ${passportActive ? "opacity-100" : "opacity-45"}`}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#9c7b8b] mb-3">Access</p>
              <ul className="flex flex-wrap gap-2">
                {ACCESS.map((label) => (
                  <li
                    key={label}
                    className="text-[10px] tracking-[0.08em] uppercase border border-[#e8e3da] bg-[#faf8f5] px-3 py-2 text-[#5c5854]"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">
        Illustrative · Managed product identity and passport infrastructure. Preparation status only — not EU certification or hardware fulfillment.
      </figcaption>
    </figure>
  );
}
