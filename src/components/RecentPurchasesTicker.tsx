"use client";

import { useState, useEffect } from "react";
import { IconPackage } from "./icons";

const purchases = [
  "129 people buying from NCK in Howrah",
  "171 people bought from NCK last month in Howrah",
];

export default function RecentPurchasesTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % purchases.length);
    }, 3000); // Change slide every 3 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 my-4">
      <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg px-4 py-3 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative h-5 overflow-hidden">
            {purchases.map((text, index) => (
              <p
                key={index}
                className={`absolute inset-0 text-sm font-medium text-foreground transition-transform duration-500 ease-in-out ${
                  index === currentIndex
                    ? "translate-y-0 opacity-100"
                    : index < currentIndex
                    ? "-translate-y-full opacity-0"
                    : "translate-y-full opacity-0"
                }`}
              >
                {text}
              </p>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-medium text-primary mb-0.5">
            {currentIndex + 1}/{purchases.length}
          </div>
          <div className="flex items-center gap-1">
            {purchases.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-primary" : "bg-surface"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
