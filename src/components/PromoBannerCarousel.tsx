"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  redirect_url: string | null;
  display_order: number;
  is_active: boolean;
}

export default function PromoBannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchBanners() {
      try {
        const res = await fetch("/api/banners");
        if (res.ok) {
          const data = await res.json();
          setBanners(data || []);
        }
      } catch {
        // silent fail — hide section
      } finally {
        setLoading(false);
      }
    }
    fetchBanners();
  }, []);

  const count = banners.length;

  const goTo = useCallback(
    (index: number) => {
      setCurrent(((index % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  // Auto-slide
  useEffect(() => {
    if (count <= 1) return;
    timerRef.current = setInterval(next, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, count]);

  // Restart timer on manual interaction
  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4000);
  }

  // Touch handlers
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
    setIsDragging(true);
    setTouchDelta(0);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  }
  function handleTouchEnd() {
    setIsDragging(false);
    if (Math.abs(touchDelta) > 50) {
      if (touchDelta < 0) goTo(current + 1);
      else goTo(current - 1);
      resetTimer();
    }
    setTouchStart(null);
    setTouchDelta(0);
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="px-3 sm:px-6 lg:px-8 mt-1">
        <div className="mx-auto max-w-7xl">
          <div
            className="w-full bg-card-bg border border-card-border animate-shimmer"
            style={{ aspectRatio: "2.4 / 1", maxHeight: "180px", borderRadius: "20px" }}
          />
        </div>
      </div>
    );
  }

  // No banners — hide completely
  if (count === 0) return null;

  const dragOffset = isDragging ? touchDelta : 0;

  return (
    <section className="px-3 sm:px-6 lg:px-8 mt-1">
      <div className="mx-auto max-w-7xl">
        <div
          className="relative overflow-hidden shadow-sm w-full"
          style={{ aspectRatio: "2.4 / 1", maxHeight: "180px", borderRadius: "20px" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slides track */}
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{
              width: `${count * 100}%`,
              transform: `translateX(calc(-${(current * 100) / count}% + ${dragOffset}px))`,
              transitionDuration: isDragging ? "0ms" : "500ms",
            }}
          >
            {banners.map((banner) => {
              const inner = (
                <div className="relative h-full w-full">
                  <Image
                    src={banner.image_url}
                    alt={banner.title || "Promotional banner"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 1200px"
                    priority={banner.display_order === 0}
                    loading={banner.display_order === 0 ? "eager" : "lazy"}
                  />
                  {/* Subtle gradient overlay for readability if title exists */}
                  {banner.title && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  )}
                  {banner.title && (
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <p className="text-white text-sm sm:text-base font-bold drop-shadow-lg line-clamp-2">
                        {banner.title}
                      </p>
                    </div>
                  )}
                </div>
              );

              return (
                <div key={banner.id} className="h-full flex-shrink-0" style={{ width: `${100 / count}%` }}>
                  {banner.redirect_url ? (
                    <Link href={banner.redirect_url} className="block h-full w-full">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </div>
              );
            })}
          </div>

          {/* Dot indicators */}
          {count > 1 && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { goTo(i); resetTimer(); }}
                  aria-label={`Go to banner ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-2.5 h-2.5 bg-white scale-110"
                      : "w-2 h-2 bg-white/50 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
