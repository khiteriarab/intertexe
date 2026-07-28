"use client";

/**
 * Digital-girl 1994 airport orbit — stamps circle the sweatpants image.
 * Travel soft, terminal energy.
 */
export function KhiteriAirportOrbit({ note }: { note: string }) {
  const stamps = ["GATE B12", "BOARDING", "JET LAG OK", "CARRY-ON", "1994", "SOFT LANDING"];

  return (
    <div className="khiteri-airport" aria-hidden>
      <div className="khiteri-airport__orbit">
        {stamps.map((label, i) => (
          <span
            key={label}
            className="khiteri-airport__stamp"
            style={{ ["--i" as string]: i, ["--n" as string]: stamps.length }}
          >
            {label}
          </span>
        ))}
      </div>
      <p className="khiteri-airport__note">{note}</p>
    </div>
  );
}
