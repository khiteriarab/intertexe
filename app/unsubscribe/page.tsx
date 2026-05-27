"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleUnsubscribe() {
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="max-w-sm w-full text-center">
        <p
          className="text-xs tracking-widest text-gray-400 mb-8"
          style={{ letterSpacing: "0.25em" }}
        >
          INTERTEXE
        </p>

        {status === "success" ? (
          <>
            <h1
              className="text-2xl font-light text-gray-900 mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              You have been unsubscribed.
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              You will no longer receive marketing emails from Intertexe. Transactional emails
              related to your account will continue.
            </p>
            <a
              href="https://www.intertexe.com"
              className="text-xs text-gray-400 underline underline-offset-4"
            >
              Return to Intertexe
            </a>
          </>
        ) : status === "error" ? (
          <>
            <h1
              className="text-2xl font-light text-gray-900 mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Something went wrong.
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Please try again or contact us at info@mail.intertexe.com
            </p>
            <button
              onClick={handleUnsubscribe}
              className="text-xs text-gray-900 underline underline-offset-4"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <h1
              className="text-2xl font-light text-gray-900 mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Unsubscribe from Intertexe emails.
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              {email
                ? `You are unsubscribing ${email} from Intertexe marketing emails.`
                : "You will be unsubscribed from Intertexe marketing emails."}
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={status === "loading"}
              className="block w-full text-xs tracking-widest uppercase bg-black text-white px-10 py-4 hover:bg-gray-800 transition-colors mb-6"
              style={{ letterSpacing: "0.2em" }}
            >
              {status === "loading" ? "Processing..." : "Confirm unsubscribe"}
            </button>
            <a
              href="https://www.intertexe.com"
              className="text-xs text-gray-400 underline underline-offset-4"
            >
              Keep my subscription
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeContent />
    </Suspense>
  );
}
