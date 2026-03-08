import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your INTERTEXE account, view your favorites, and access your quiz history.",
  alternates: { canonical: "https://www.intertexe.com/account" },
};

export default function AccountPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 text-center">
      <h1 className="text-3xl md:text-5xl font-serif mb-4" data-testid="text-account-title">
        My Account
      </h1>
      <p className="text-muted-foreground text-sm md:text-base max-w-md mb-8 leading-relaxed">
        Account management coming soon to the new platform.
      </p>
    </div>
  );
}
