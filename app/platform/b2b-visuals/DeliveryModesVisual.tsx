"use client";

import Image from "next/image";
import Link from "next/link";
import { PASSPORT_CASE_STUDY } from "../../../lib/enterprise/passport-case-study";

const MODES = [
  { id: "hosted", title: "Hosted passport", copy: "Launch without additional frontend development." },
  { id: "white-label", title: "White label", copy: "Deliver through the brand's own visual ecosystem." },
  { id: "api", title: "API", copy: "Send approved product fields into existing experiences." },
] as const;

export function DeliveryModesVisual() {
  return (
    <figure className="m-0 platform-delivery-storyline">
      <p className="platform-delivery-storyline-kicker">
        One governed record · three delivery modes · not mutually exclusive
      </p>

      <div className="platform-delivery-arch">
        <div className="platform-delivery-arch-node is-source">
          <p className="platform-delivery-arch-kicker">Product record</p>
          <p className="platform-delivery-arch-title">One governed source of truth</p>
          <p className="platform-delivery-arch-meta">identity · materials · origin · traceability</p>
        </div>
        <div className="platform-delivery-arch-arrow" aria-hidden>
          ↓
        </div>
        <div className="platform-delivery-arch-node">
          <p className="platform-delivery-arch-kicker">Publication engine</p>
          <p className="platform-delivery-arch-title">Approved fields only</p>
          <p className="platform-delivery-arch-meta">Control what leaves the system before go-live.</p>
        </div>
        <div className="platform-delivery-arch-arrow" aria-hidden>
          ↓
        </div>
        <div className="platform-delivery-arch-split">
          {MODES.map((mode) => (
            <div key={mode.id} className="platform-delivery-arch-node">
              <p className="platform-delivery-arch-kicker">{mode.title}</p>
              <p className="platform-delivery-arch-meta">{mode.copy}</p>
            </div>
          ))}
        </div>
        <div className="platform-delivery-arch-arrow" aria-hidden>
          ↓
        </div>
        <div className="platform-delivery-arch-node">
          <p className="platform-delivery-arch-kicker">Data carrier</p>
          <p className="platform-delivery-arch-title">QR · NFC · RFID · Web</p>
        </div>
        <div className="platform-delivery-arch-arrow" aria-hidden>
          ↓
        </div>
        <div className="platform-delivery-arch-node">
          <p className="platform-delivery-arch-kicker">Consumer</p>
          <p className="platform-delivery-arch-title">Brand app · brand site · hosted passport</p>
        </div>
      </div>

      <div className="platform-delivery-case">
        <div className="platform-delivery-case-image">
          <Image
            src={PASSPORT_CASE_STUDY.imageUrl}
            alt={`${PASSPORT_CASE_STUDY.brand} ${PASSPORT_CASE_STUDY.productName}`}
            fill
            className="object-cover"
            sizes="160px"
            unoptimized
          />
        </div>
        <div>
          <p className="platform-delivery-case-kicker">Live product passport</p>
          <p className="platform-delivery-case-title">{PASSPORT_CASE_STUDY.brand}</p>
          <p className="platform-delivery-case-copy">
            See how a governed INTERTEXE record becomes a consumer-facing product passport.
          </p>
        </div>
        <Link href={`/p/${PASSPORT_CASE_STUDY.publicId}`} className="platform-delivery-case-link">
          Open the passport →
        </Link>
      </div>
    </figure>
  );
}
