import Link from "next/link";

export default function PlatformLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="max-w-sm w-full text-center">
        <Link
          href="/platform"
          className="text-sm tracking-widest font-light block mb-16"
          style={{ letterSpacing: "0.3em" }}
        >
          INTER<span className="font-semibold">TEXE</span>
        </Link>

        <p className="text-xs tracking-widest text-gray-400 mb-6" style={{ letterSpacing: "0.25em" }}>
          PLATFORM LOGIN
        </p>

        <h1 className="text-2xl font-light text-gray-900 mb-4" style={{ fontFamily: "Georgia, serif" }}>
          Partner access
        </h1>

        <p className="text-sm text-gray-500 leading-relaxed mb-10">
          Platform login is coming soon. Contact us to request early API access and we will set up your account
          directly.
        </p>

        <a
          href="mailto:platform@intertexe.com"
          className="block text-xs tracking-widest uppercase bg-black text-white px-10 py-4 w-full text-center hover:bg-gray-800 transition-colors mb-6"
          style={{ letterSpacing: "0.2em" }}
        >
          Request access
        </a>

        <Link href="/platform" className="text-xs text-gray-400 underline underline-offset-4">
          Back to platform overview
        </Link>
      </div>
    </div>
  );
}
