import { redirect } from "next/navigation";

export const metadata = {
  title: "Wishlist | INTERTEXE",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  redirect("/account");
}
