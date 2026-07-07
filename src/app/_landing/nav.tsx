"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setMobileOpen(false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#08090d]/90 backdrop-blur-2xl border-b border-white/8 shadow-xl shadow-black/40"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Eunoia AI OS home">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white text-xs font-bold tracking-tight">E</span>
            </div>
            <span className="font-semibold text-sm tracking-tight">Eunoia AI OS</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[
              { href: "#features", label: "Features" },
              { href: "#industries", label: "Industries" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-2 text-sm text-white/55 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-150"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/55 hover:text-white transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <a
              href="#demo"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
            >
              Book a Demo
            </a>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span
                className={`block h-0.5 bg-white/70 rounded transition-all duration-300 ${
                  mobileOpen ? "rotate-45 translate-y-[7px]" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-white/70 rounded transition-all duration-300 ${
                  mobileOpen ? "opacity-0 scale-x-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-white/70 rounded transition-all duration-300 ${
                  mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
                }`}
              />
            </div>
          </button>
        </nav>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 bg-[#08090d]/97 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {[
              { href: "#features", label: "Features" },
              { href: "#industries", label: "Industries" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={close}
                className="block px-3 py-2.5 text-sm text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/8 space-y-2">
              <Link
                href="/login"
                onClick={close}
                className="block px-3 py-2.5 text-sm text-white/60 hover:text-white"
              >
                Sign in
              </Link>
              <a
                href="#demo"
                onClick={close}
                className="block px-3 py-2.5 text-sm font-medium text-white bg-accent rounded-lg text-center hover:opacity-90"
              >
                Book a Demo
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
