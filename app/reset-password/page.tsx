import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = {
  title: "Reset Password | INTERTEXE",
  description: "Set a new password for your INTERTEXE account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
