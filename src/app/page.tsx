"use client";

import ProductGrid from "@/components/ProductGrid";
import HeroCarousel from "@/components/HeroCarousel";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Stats Bar */}
      <section className="border-y border-card-border bg-card-bg/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t("stat_products"), value: "50+", icon: "📦" },
              { label: t("stat_categories"), value: "8+", icon: "🏷️" },
              { label: t("stat_dealers"), value: "200+", icon: "🤝" },
              { label: t("stat_years"), value: "10+", icon: "⭐" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-xl px-4 py-3">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("products_title")}</h2>
            <p className="mt-2 text-muted">{t("products_subtitle")}</p>
          </div>
          <ProductGrid />
        </div>
      </section>
    </>
  );
}
