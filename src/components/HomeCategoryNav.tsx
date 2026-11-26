"use client";

import Link from "next/link";
import { HOME_CATEGORIES } from "@/lib/types";
import { IconShieldPlant, IconSprout, IconWheat, IconTools, IconPackage } from "@/components/icons";

/* ─── Category Icon Map ─── */
const CATEGORY_CONFIG: Record<string, { icon: React.FC<React.SVGProps<SVGSVGElement>> }> = {
  "Crop Protection": {
    icon: IconShieldPlant,
  },
  "Crop Nutrition": {
    icon: IconSprout,
  },
  Seeds: {
    icon: IconWheat,
  },
  "Agro Tools": {
    icon: IconTools,
  },
};

export default function HomeCategoryNav() {
  return (
    <section className="px-3 sm:px-6 lg:px-8 mt-3">
      <div className="mx-auto max-w-7xl">
        <div
          className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {HOME_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat] || {
              icon: IconPackage,
            };
            const IconComponent = config.icon;

            return (
              <Link
                key={cat}
                href={`/products?home_category=${encodeURIComponent(cat)}`}
                className="snap-center flex flex-col items-center gap-1.5 shrink-0 group"
                style={{ minWidth: "72px" }}
              >
                {/* Circle icon container */}
                <div
                  className="flex items-center justify-center rounded-full bg-white transition-all duration-300 group-hover:scale-110 group-active:scale-95 shadow-sm border border-card-border group-hover:border-primary/30 group-hover:shadow-md"
                  style={{ width: "64px", height: "64px" }}
                >
                  <IconComponent className="w-8 h-8 text-foreground" />
                </div>

                {/* Category name */}
                <span className="text-[11px] font-semibold text-foreground text-center leading-tight max-w-[72px] line-clamp-2 group-hover:text-primary transition-colors">
                  {cat}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
