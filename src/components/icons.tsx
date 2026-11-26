import React from "react";

// Minimalist Botanical Icon Pack
// Style: Thin solid dark outline, simple 2D vector, light green accent fill

export function IconWheat(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Accent Fill */}
      <path d="M12 21v-8M12 13c-2.5 0-4-1.5-4-4s1.5-4 4-4M12 13c2.5 0 4-1.5 4-4s-1.5-4-4-4" fill="var(--color-primary-light)" stroke="none" />
      {/* Outline */}
      <path d="M12 22V8" />
      <path d="M12 18c-2 0-3-1-3-2.5S10 13 12 13" />
      <path d="M12 18c2 0 3-1 3-2.5S14 13 12 13" />
      <path d="M12 13c-2 0-3-1-3-2.5S10 8 12 8" />
      <path d="M12 13c2 0 3-1 3-2.5S14 8 12 8" />
      <path d="M12 8c-1.5 0-2.5-1-2.5-2.5S10.5 3 12 3" />
      <path d="M12 8c1.5 0 2.5-1 2.5-2.5S13.5 3 12 3" />
    </svg>
  );
}

export function IconSunflower(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Accent Fill */}
      <circle cx="12" cy="10" r="4" fill="var(--color-primary-light)" stroke="none" />
      <path d="M12 22v-6M12 16c-2 0-4-1-4-3s2-2 4-2" fill="var(--color-primary-light)" stroke="none" opacity="0.5" />
      {/* Outline */}
      <path d="M12 22v-8" />
      <circle cx="12" cy="10" r="3" />
      <path d="M12 7c0-2.5-1.5-4-3-4s-1 2.5 0 3.5" />
      <path d="M12 7c0-2.5 1.5-4 3-4s1 2.5 0 3.5" />
      <path d="M9 10c-2.5 0-4-1.5-4-3s2.5-1 3.5 0" />
      <path d="M15 10c2.5 0 4-1.5 4-3s-2.5-1-3.5 0" />
      <path d="M12 13c0 2.5-1.5 4-3 4s-1-2.5 0-3.5" />
      <path d="M12 13c0 2.5 1.5 4 3 4s1-2.5 0-3.5" />
      <path d="M9 10c-2.5 0-4 1.5-4 3s2.5 1 3.5 0" />
      <path d="M15 10c2.5 0 4 1.5 4 3s-2.5 1-3.5 0" />
      {/* Leaf */}
      <path d="M12 17c2.5 0 4.5-1.5 4.5-3.5S14 11 12 12" />
    </svg>
  );
}

export function IconSprout(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Accent Fill */}
      <path d="M12 22v-7c0-3 2-5 5-5s4 1 4 4-2 3-5 3h-4" fill="var(--color-primary-light)" stroke="none" />
      {/* Outline */}
      <path d="M12 22v-9" />
      <path d="M12 13c0-3 2.5-5 5-5s4 1.5 4 4-2.5 3-5 3h-4" />
      <path d="M12 17c0-2.5-2-4-4-4s-3 1-3 3 2 2 4 2h3" />
      <path d="M3 22h18" />
    </svg>
  );
}

export function IconShieldPlant(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Accent Fill */}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="var(--color-primary-light)" stroke="none" />
      {/* Outline */}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 17v-8" />
      <path d="M12 13c1.5 0 2.5-1 2.5-2.5S13.5 9 12 9" />
      <path d="M12 13c-1.5 0-2.5-1-2.5-2.5S10.5 9 12 9" />
    </svg>
  );
}

export function IconTools(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Accent Fill */}
      <circle cx="16" cy="8" r="5" fill="var(--color-primary-light)" stroke="none" />
      {/* Outline */}
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function IconPackage(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Accent Fill */}
      <polygon points="21 16 12 21 3 16 3 8 12 3 21 8 21 16" fill="var(--color-primary-light)" stroke="none" />
      {/* Outline */}
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function IconTag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" fill="var(--color-primary-light)" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

export function IconHandshake(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="var(--color-primary-light)" />
    </svg>
  );
}

export function IconStar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="var(--color-primary-light)" />
    </svg>
  );
}
