import { redirect } from "next/navigation";

export const metadata = {
  title: "Favorites | INTERTEXE",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  redirect("/account");
}
