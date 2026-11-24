"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

interface Slide {
  image: string;
  headingKey: string;
  subtextKey: string;
  ctaKey: string;
  ctaHref: string;
}

const slides: Slide[] = [
  {
    image: "/banners/slide-1.png",
    headingKey: "slide1_heading",
    subtextKey: "slide1_subtext",
    ctaKey: "slide1_cta",
    ctaHref: "#products",
  },
  {
    image: "/banners/slide-2.png",
    headingKey: "slide2_heading",
    subtextKey: "slide2_subtext",
    ctaKey: "slide2_cta",
    ctaHref: "#products",
  },
  {
    image: "/banners/slide-3.png",
    headingKey: "slide3_heading",
    subtextKey: "slide3_subtext",
    ctaKey: "slide3_cta",
    ctaHref: "#products",
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { t } = useLanguage();

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || index === current) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 700);
    },
    [current, isTransitioning]
  );

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, goTo]);

  // Auto-slide every 4 seconds
  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative w-full overflow-hidden bg-foreground" style={{ height: "clamp(360px, 55vh, 600px)" }}>
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            i === current
              ? "opacity-100 scale-100"
              : "opacity-0 scale-105"
          }`}
          aria-hidden={i !== current}
        >
          {/* Background Image */}
          <Image
            src={slide.image}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority={i === 0}
          />
          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />

          {/* Content */}
          <div className="relative z-10 flex h-full items-center">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl">
                <h2
                  className={`text-3xl font-extrabold text-white leading-tight sm:text-4xl lg:text-5xl transition-all duration-700 ${
                    i === current
                      ? "translate-y-0 opacity-100 delay-200"
                      : "translate-y-6 opacity-0"
                  }`}
                >
                  {t(slide.headingKey as Parameters<typeof t>[0])}
                </h2>
                <p
                  className={`mt-4 text-base text-white/80 leading-relaxed sm:text-lg max-w-lg transition-all duration-700 ${
                    i === current
                      ? "translate-y-0 opacity-100 delay-300"
                      : "translate-y-6 opacity-0"
                  }`}
                >
                  {t(slide.subtextKey as Parameters<typeof t>[0])}
                </p>
                <a
                  href={slide.ctaHref}
                  className={`mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.97] transition-all duration-700 ${
                    i === current
                      ? "translate-y-0 opacity-100 delay-[400ms]"
                      : "translate-y-6 opacity-0"
                  }`}
                >
                  {t(slide.ctaKey as Parameters<typeof t>[0])}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Left / Right Arrows */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/25 active:scale-90 transition-all sm:h-12 sm:w-12"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/25 active:scale-90 transition-all sm:h-12 sm:w-12"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-8 h-2.5 bg-white"
                : "w-2.5 h-2.5 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 z-20 h-1 w-full bg-white/10">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((current + 1) / slides.length) * 100}%` }}
        />
      </div>
    </section>
  );
}
