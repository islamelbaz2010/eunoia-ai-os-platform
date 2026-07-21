# DEMO SCRIPT
**Eunoia AI OS — 5-Minute Exhibition Demo**  
**Format**: Live walkthrough on laptop  
**Goal**: Maximum customer excitement and qualified demo requests  
**Prerequisites**: Infrastructure blockers fixed (see FINAL_VERDICT.md)

---

## Pre-Demo Setup (Do This Before Each Demo)

1. Open a browser in **private/incognito mode** — starts fresh every time
2. Navigate to **https://eunoia-ai-os-platform.vercel.app**
3. Have a **pre-loaded demo account** ready (do NOT sign up live — use a seeded demo org)
4. Demo account should have:
   - 3–5 Knowledge Base documents pre-loaded (hotel policies, F&B menu, VIP protocol)
   - 4–6 CRM contacts with various pipeline stages
5. Keep the **landing page open in a second tab**
6. Audio: Make sure your laptop audio is on (streaming sounds cool with typing effect)

---

## The 5-Minute Script

### MINUTE 0:00–0:45 — The Hook (Landing Page)

> "Let me show you what we built."

Point at the hero section:
> "Hotels have knowledge everywhere — WhatsApp groups, printed binders, shared Google Docs that nobody reads. A new front desk team member asks 'What time is breakfast?' and the manager stops what they're doing to answer. Again. And again. That's 3 hours a day of a manager's time, lost."

Point at the chat mockup in the hero:
> "Eunoia gives every team member the right answer instantly — with a citation. Watch."

**→ Switch to the demo account dashboard**

---

### MINUTE 0:45–2:00 — The AI Demo (The Show-Stopper)

Navigate to: **Dashboard → RAG Assistant**

> "This is the AI assistant. It only answers from your property's own documents — it never makes things up."

Type in the chat box:
> **"What is the policy for checking in VIP guests after midnight?"**

Watch the streaming response appear token by token with sources.

> "See how it's pulling from our VIP Protocol document — the source is right there, with an 94% confidence score. If the document changes, the AI answer changes. If the document doesn't have the answer, it says so."

Type a follow-up question:
> **"Can guests request late checkout? What's the procedure?"**

Let it stream.

> "This is GPT-4 quality — but the answers are from YOUR documents, not the internet. No hallucinations. No generic responses. Your F&B menu. Your check-in policy. Your emergency procedures."

**→ This is the 'wow' moment. Let them process it.**

---

### MINUTE 2:00–3:15 — The CRM Demo (Depth)

Navigate to: **Dashboard → CRM → Pipeline**

> "The AI assistant is for operations. The CRM is for revenue. Every lead, travel agent, corporate client — managed here."

Point at the pipeline board:
> "Drag and drop. The stages match hospitality reality: Lead → Qualified → Proposal → Negotiation → Won. Every move is logged in the audit trail."

Click on a contact:
> "Each contact has a full timeline — notes, calls, emails, WhatsApp conversations, follow-up tasks. One view for every interaction with a client."

Navigate back to the list and show the search:
> "Search by name, company, or stage. Filter by status. Export to CSV for your existing tools. Import from CSV if you have existing data."

---

### MINUTE 3:15–4:00 — The Setup Story (Credibility)

Navigate to: **Dashboard → Knowledge Base**

> "Here's how a hotel goes live. You paste your documents — policies, menus, SOPs, anything. We chunk them, embed them, and store them as vectors. Takes about 2 minutes per document. Most hotels are fully operational the same day."

Point at the document list:
> "Arabic documents work. A staff member can ask in Arabic and get an Arabic answer. The AI handles the language automatically."

Navigate to: **Dashboard → Settings**

> "Invite your team. Set their roles — admin, member, viewer. Every action is logged in the audit trail. You know exactly who accessed what, when."

---

### MINUTE 4:00–4:30 — The Business Case (For Decision-Makers)

Navigate to: **Dashboard → Billing**

> "Pricing is simple. $99 a month for a single property with up to 5 team members. No per-query fees. No setup fees. No minimum contract. A manager at $25/hour saves 3 hours a day — the ROI pays for 4 years of this subscription in one month."

> "Pro is $299 for larger teams. Enterprise is custom for groups and chains with multiple properties."

---

### MINUTE 4:30–5:00 — The Close

Navigate back to: **Landing page → Demo section**

> "We're based in Cairo, serving hotels in Egypt, UAE, and Saudi Arabia. If you want to see it with your actual content — your menus, your policies — fill this in and we'll do a 30-minute live walkthrough next week."

**→ Hand them your phone or laptop to fill the demo request form**

> "You can also start free right now — no credit card. Takes 5 minutes."

---

## Handling Tough Questions

### "What about data security?"
> "Your data never leaves your organization. Every database row has row-level security — our AI cannot access another hotel's documents, and neither can we. All data is encrypted in transit and at rest on Supabase's infrastructure."

### "What if the AI gives a wrong answer?"
> "It only answers from your documents. If the document says breakfast is at 7am and it's actually at 7:30am, update the document and the AI answer updates immediately. If the Knowledge Base doesn't have the answer, the AI says 'I don't know' — it never invents information."

### "Does it work in Arabic?"
> "The AI understands and responds in Arabic. You can upload Arabic documents, ask questions in Arabic, and mix both languages in the same session."

### "How long does setup take?"
> "For a single property: create an account in 2 minutes, upload your first document in 3 minutes, first AI-answered query in under 10 minutes. Most hotels have their first 20 documents loaded on day one."

### "What integrations do you have?"
> "Today: CSV import/export for your CRM data. On the roadmap: WhatsApp, property management systems, and Zapier for anything else. For enterprise customers, we build custom integrations."

### "How is this different from ChatGPT?"
> "ChatGPT answers from the internet. We answer from YOUR property's documents. ChatGPT doesn't know your F&B menu. It doesn't know your VIP protocol. Eunoia does."

### "What's your team size?"
> Be honest about early-stage status. The product quality speaks for itself.

---

## What NOT to Demo

- **Do NOT refresh the page mid-demo** — chat history will disappear
- **Do NOT try to sign up live** — onboarding flow depends on migrations that may vary
- **Do NOT show the billing upgrade buttons** (unless Stripe is configured) — shows "not available"
- **Do NOT demo on a phone** — no mobile dashboard nav
- **Do NOT show the admin panel** — too technical for customer demos
- **Do NOT try to show email invite flow** — only demo if RESEND is confirmed working

---

## Demo Account Setup Instructions

Before the exhibition, create and seed a demo account:

1. Go to /signup → create account with `demo@eunoiaos.com`
2. Create organization: "Grand Nile Tower Hotel"
3. Add 5 Knowledge Base documents:
   - VIP Guest Protocol (paste your best policy content)
   - F&B Menu — Rooftop Restaurant
   - Check-in/Check-out Procedures
   - Emergency Procedures
   - Staff Grooming Standards
4. Add 6 CRM contacts at different pipeline stages
5. Ask 3 test questions to verify RAG is working
6. Verify sources appear correctly

**Test these questions in advance — know the expected answers:**
- "What time is breakfast on weekends?"
- "What is the VIP late checkout policy?"
- "How do I handle a guest medical emergency?"
