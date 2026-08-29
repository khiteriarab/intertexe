import Link from "next/link";
import { TAILORING_EDITORIAL_HERO } from "../../lib/editorial-assets";

const DEPARTMENTS = [
  {
    name: "Clothing",
    href: "/shop/clothing/all",
    imageUrl: TAILORING_EDITORIAL_HERO,
    testId: "shop-dept-clothing",
  },
  {
    name: "Shoes",
    href: "/shop/shoes/all",
    imageUrl: "/fabrics/fabric-leather.jpg",
    testId: "shop-dept-shoes",
  },
] as const;

/** Outnet-style visual department entry — complements the flat NAP text list below. */
export function ShopDepartmentCards() {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6" data-testid="shop-department-cards">
      {DEPARTMENTS.map((dept) => (
        <Link
          key={dept.href}
          href={dept.href}
          className="group flex flex-col touch-manipulation"
          data-testid={dept.testId}
        >
          <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#eae8e4]">
            <img
              src={dept.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
              draggable={false}
            />
          </div>
          <span className="mt-2.5 text-[11px] uppercase tracking-[0.2em] text-center text-foreground group-hover:text-muted-foreground transition-colors">
            {dept.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
