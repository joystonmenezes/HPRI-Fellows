"use client";

import { useEffect, useState } from "react";

// The hero background. With no admin-set photos it falls back to the bundled
// /banner.jpg (the original look). With one photo it shows that photo; with
// several it cross-fades through them like a photo story, advancing on the
// admin-set timer (default two seconds). The cardinal wash and bottom darkening
// keep the white title readable.
export function HeroBanner({
  images,
  seconds = 2,
}: {
  images: string[];
  seconds?: number;
}) {
  const slides = images.length > 0 ? images : ["/banner.jpg"];
  const key = slides.join("|");
  const count = slides.length;
  // Clamp to a sane floor so a tiny value can't spin the slideshow too fast.
  const intervalMs = Math.max(1, seconds) * 1000;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Restart from the first photo whenever the set changes, then advance only
    // when there is more than one to show.
    setIdx(0);
    if (count < 2) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [key, count, intervalMs]);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 bg-gradient-to-br from-cardinal-dark via-cardinal to-cardinal-dark"
    >
      {slides.map((src, i) => (
        <div
          key={`${i}-${src}`}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            i === idx ? "animate-slow-zoom opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url('${src.replace(/'/g, "%27")}')` }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-cardinal-dark/60 via-cardinal-dark/30 to-cardinal/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
    </div>
  );
}
