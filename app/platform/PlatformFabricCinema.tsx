import Image from "next/image";

/** Full-bleed fashion/fabric beat between product story and delivery. */
export function PlatformFabricCinema() {
  return (
    <section className="platform-fabric-cinema" aria-label="Material close-up">
      <Image
        src="/fabrics/fabric-silk.jpg"
        alt=""
        fill
        className="platform-fabric-cinema-image"
        sizes="100vw"
        priority={false}
      />
      <div className="platform-fabric-cinema-scrim" aria-hidden />
    </section>
  );
}
