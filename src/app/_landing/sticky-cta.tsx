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
          <p className="text-sm font-medium text-white truncate">Ready to get started?</p>
          <p className="text-xs text-white/45 truncate">Live in 2 hours · No setup fees</p>
        </div>
        <a
          href="#demo"
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
        >
          Book Demo
        </a>
      </div>
    </div>
  );
}
