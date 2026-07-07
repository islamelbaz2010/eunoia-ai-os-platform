"use client";

import { useState, useEffect } from "react";

export function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    const hero = document.getElementById("hero");
    if (hero) observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm sm:max-w-md">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-[#0f1117]/95 backdrop-blur-2xl px-4 py-3 shadow-2xl shadow-black/60">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">Ready to see your AI workspace?</p>
          <p className="truncate text-xs text-white/45">Start now or book a guided demo</p>
        </div>
        <a
          href="/signup"
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
        >
          Start
        </a>
      </div>
    </div>
  );
}
