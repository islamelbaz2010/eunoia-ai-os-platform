import type { Metadata } from "next";
import { LandingNav } from "./_landing/nav";
import { Hero } from "./_landing/hero";
import { Problem } from "./_landing/problem";
import { Solution } from "./_landing/solution";
import { HowItWorks } from "./_landing/how-it-works";
import { Industries } from "./_landing/industries";
import { AiFeatures } from "./_landing/ai-features";
import { CrmSection } from "./_landing/crm-section";
import { Roi } from "./_landing/roi";
import { Pricing } from "./_landing/pricing";
import { Faq } from "./_landing/faq";
import { Demo } from "./_landing/demo";
import { Footer } from "./_landing/footer";
import { StickyCTA } from "./_landing/sticky-cta";

export const metadata: Metadata = {
  title: "Eunoia AI OS — AI Knowledge & CRM for Hospitality",
  description:
    "Upload your policies, menus, and SOPs once. Your team gets instant, cited AI answers in Arabic or English. Built for hotels, resorts, and hospitality groups across Egypt, UAE, and Saudi Arabia.",
  openGraph: {
    title: "Eunoia AI OS — AI Knowledge & CRM for Hospitality",
    description:
      "The AI Operating System for hospitality teams. Knowledge Base + RAG Assistant + CRM. Live in 2 hours.",
  },
  twitter: {
    title: "Eunoia AI OS — AI Knowledge & CRM for Hospitality",
    description:
      "The AI Operating System for hospitality teams. Knowledge Base + RAG Assistant + CRM. Live in 2 hours.",
  },
};

export default function HomePage() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <Industries />
        <AiFeatures />
        <CrmSection />
        <Roi />
        <Pricing />
        <Faq />
        <Demo />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
