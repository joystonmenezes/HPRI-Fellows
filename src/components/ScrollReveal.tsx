"use client";

import { useEffect } from "react";

// Gently reveals elements marked with the `reveal` class as they scroll into
// view. Content is visible by default (no-JS / SSR safe); this only adds the
// motion. Above-the-fold elements are left visible so nothing flashes on load.
export function ScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (els.length === 0) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("reveal-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.remove("reveal-pending");
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const vh = window.innerHeight;
    els.forEach((el) => {
      if (el.getBoundingClientRect().top > vh * 0.85) {
        el.classList.add("reveal-pending");
        io.observe(el);
      } else {
        el.classList.add("reveal-in");
      }
    });

    return () => io.disconnect();
  }, []);

  return null;
}
