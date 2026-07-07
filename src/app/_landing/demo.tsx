"use client";

import { useActionState } from "react";
import { submitDemoRequest, type DemoState } from "./demo-actions";

function DemoForm() {
  const [state, action, pending] = useActionState<DemoState, FormData>(
    submitDemoRequest,
    undefined
  );

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-accent-2/30 bg-accent-2/5 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-accent-2/15 border border-accent-2/30 flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10l4 4 8-8" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Request received!</h3>
        <p className="text-sm text-white/55">
          We&apos;ll reach out within 24 hours to schedule your demo.
          In the meantime, feel free to{" "}
          <a href="/signup" className="text-accent hover:underline">create a free account</a>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="demo-name" className="block text-sm text-white/60 mb-1.5">
            Full name <span className="text-red-400">*</span>
          </label>
          <input
            id="demo-name"
            name="name"
            type="text"
            required
            placeholder="Ahmed Hassan"
            className="input-field w-full"
          />
        </div>
        <div>
          <label htmlFor="demo-email" className="block text-sm text-white/60 mb-1.5">
            Work email <span className="text-red-400">*</span>
          </label>
          <input
            id="demo-email"
            name="email"
            type="email"
            required
            placeholder="ahmed@grandnile.com"
            className="input-field w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="demo-property" className="block text-sm text-white/60 mb-1.5">
            Property name <span className="text-red-400">*</span>
          </label>
          <input
            id="demo-property"
            name="property"
            type="text"
            required
            placeholder="Grand Nile Tower Hotel"
            className="input-field w-full"
          />
        </div>
        <div>
          <label htmlFor="demo-type" className="block text-sm text-white/60 mb-1.5">
            Property type
          </label>
          <select id="demo-type" name="propertyType" className="input-field w-full">
            <option value="">Select type</option>
            <option>Luxury Hotel</option>
            <option>Boutique Hotel</option>
            <option>Resort</option>
            <option>Hotel Group / Chain</option>
            <option>Diving Center</option>
            <option>Corporate Hospitality</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="demo-message" className="block text-sm text-white/60 mb-1.5">
          What&apos;s your biggest operational challenge?
        </label>
        <textarea
          id="demo-message"
          name="message"
          rows={4}
          placeholder="Tell us about your team size, what knowledge you'd like to centralize, or any specific problems you're trying to solve…"
          className="input-field w-full resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-indigo-500/20"
      >
        {pending ? "Sending…" : "Book a Demo"}
      </button>

      <p className="text-center text-xs text-white/30">
        We respond within 24 hours · No sales pressure · 30-minute demo
      </p>
    </form>
  );
}

export function Demo() {
  return (
    <section id="demo" className="landing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">Book a Demo</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text leading-tight">
              See Eunoia AI OS in your property.
            </h2>
            <p className="mt-4 text-base text-white/55 leading-relaxed">
              In 30 minutes, we&apos;ll show you exactly how to centralize your property&apos;s knowledge and
              deploy the AI assistant for your team — with your actual content.
            </p>

            <div className="mt-8 space-y-4">
              {[
                {
                  icon: "📋",
                  title: "We review your setup",
                  body: "Tell us your property type, team size, and the knowledge you want to centralize.",
                },
                {
                  icon: "🚀",
                  title: "Live walkthrough",
                  body: "We demo with your actual content — not generic placeholder data.",
                },
                {
                  icon: "📞",
                  title: "Q&A",
                  body: "Ask anything. Pricing, security, integrations, Arabic support — all covered.",
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/4 flex items-center justify-center shrink-0 text-lg">
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-sm text-white/45 mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/6">
              <p className="text-sm text-white/40">
                Prefer to start immediately?{" "}
                <a href="/signup" className="text-accent hover:underline font-medium">
                  Create a free account →
                </a>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/2 p-7">
            <DemoForm />
          </div>
        </div>
      </div>
    </section>
  );
}
