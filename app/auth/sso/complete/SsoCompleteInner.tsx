"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Client-side SSO completion for SAML/hash token redirects from Supabase Auth. */
export default function SsoCompleteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    async function complete() {
      const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const error = hashParams.get("error") || params.get("error");

      if (error) {
        router.replace(`/dashboard/login?sso_error=exchange_failed`);
        return;
      }
      if (!accessToken) {
        router.replace("/dashboard/login?sso_error=invalid_callback");
        return;
      }

      const res = await fetch("/api/auth/sso/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          next: params.get("next"),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; redirectTo?: string; message?: string };
      if (!res.ok || !data.redirectTo) {
        setMessage(data.message || "Sign-in could not be completed.");
        setTimeout(() => router.replace("/dashboard/login?sso_error=not_authorized"), 1500);
        return;
      }
      router.replace(data.redirectTo);
    }
    void complete();
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
      <p className="text-sm">{message}</p>
    </div>
  );
}
