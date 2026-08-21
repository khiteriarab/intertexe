import type { Metadata } from "next";
<<<<<<< Updated upstream
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Platform login",
  description: "Sign in to the INTERTEXE workspace.",
};
=======
import Link from "next/link";
>>>>>>> Stashed changes

export const metadata: Metadata = {
  title: "Partner & operator access",
  robots: { index: false, follow: false },
};

export default function PlatformLoginPage() {
<<<<<<< Updated upstream
  redirect("/dashboard/login");
=======
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
          PLATFORM ACCESS
        </p>

        <h1 className="text-2xl font-light text-gray-900 mb-4" style={{ fontFamily: "Georgia, serif" }}>
          Partner & operator access
        </h1>

        <p className="text-sm text-gray-500 leading-relaxed mb-10">
          API partners and brands: contact us for access. INTERTEXE operators sign in to the private dashboard.
        </p>

        <a
          href="mailto:info@intertexe.com"
          className="block text-xs tracking-widest uppercase bg-black text-white px-10 py-4 w-full text-center hover:bg-gray-800 transition-colors mb-4"
          style={{ letterSpacing: "0.2em" }}
        >
          Contact us
        </a>

        <Link
          href="/dashboard/login"
          className="block text-xs tracking-widest uppercase border border-gray-200 text-gray-900 px-10 py-4 w-full text-center hover:bg-gray-50 transition-colors mb-6"
          style={{ letterSpacing: "0.2em" }}
        >
          Operator sign in
        </Link>
      </div>
    </div>
  );
>>>>>>> Stashed changes
}
