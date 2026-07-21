# CUSTOMER DEMO REPORT
**Eunoia AI OS — Full Customer Journey Simulation**  
**Date**: 2026-07-12  
**Perspective**: First-time visitor at exhibition booth

---

## The Customer Journey: 15 Steps Simulated

### STEP 1: Visitor opens landing page
**URL**: https://eunoia-ai-os-platform.vercel.app  
**Verified**: ✅ HTTP 200, page loads  
**Impression**: Strong. Dark-mode SaaS aesthetic. Clear hero: "Your hotel's brain. Powered by AI." The animated chat mockup immediately shows the product in action.  
**Friction**: None at this step.  
**Score**: 9/10

---

### STEP 2: Visitor reads the hero section
**What they see**: Headline, subtitle, "Start Free Trial" CTA, trust badges (Live in 2 hours, No credit card, No setup fees), and flag emojis for Egypt/UAE/KSA  
**Impression**: Professional. MENA focus is clear and reassuring for regional visitors. The ROI framing ("No guessing. No WhatsApp threads.") hits the pain point directly.  
**Friction**: "AI Operating System for Hospitality" badge text is small and easy to miss.  
**Score**: 8/10

---

### STEP 3: Visitor scrolls through the page
**Sections seen**: Problem → Solution → How It Works → Industries → AI Features → CRM → ROI → Pricing → FAQ → Demo  
**Impression**: Complete story. Problem is named. Solution is demonstrated with mockups. Industries section shows it's for their specific property type. ROI section has specific numbers.  
**Issues found**:
- ROI stats ("3hrs saved daily", "50+ queries per hour") are claims without customer evidence. An investor will ask "where's the proof?" 
- The "Features" nav link scrolls to the Solution section — minor navigation labeling mismatch
- No customer logos, no testimonials, no "Trusted by X hotels" social proof
**Score**: 7/10

---

### STEP 4: Visitor clicks "Get Started" / "Start Free Trial"
**URL**: /signup  
**Verified**: ✅ HTTP 200, page loads  
**What they see**: Two-column layout. Left: marketing copy with 3-step process. Right: registration form (full name, email, password).  
**Impression**: Professional form. "No credit card needed for setup" is prominently displayed.  
**Friction**: No Google/Apple OAuth. Email/password only. For hospitality managers used to social login, this is a small barrier.  
**Score**: 8/10

---

### STEP 5: Visitor registers
**Code Path**: `signup()` Server Action → Supabase auth.signUp → redirect to /onboarding  
**Verified**: Code is correct. Production behavior depends on Supabase auth settings.  
**Issue**: No email verification enforced — user is immediately active. This is good for conversion but bad for security.  
**Issue**: If email is already registered, error message says "User already registered" — could be used for account enumeration.  
**Score**: 8/10

---

### STEP 6: Visitor creates organization (Onboarding)
**URL**: /onboarding  
**Code Path**: `createOrganization()` → `supabase.rpc("create_organization", {org_name, org_slug})` → redirect to /dashboard  
**Verified**: Code is correct. Production behavior depends on migration 0005 being applied.  
**Form**: Organization name field with helpful placeholder "Grand Nile Tower Hotel"  
**Issue**: If the `create_organization` RPC doesn't exist (migration 0005 not applied or failed), user sees: "Failed to create workspace. Please try again." — with no further guidance.  
**Issue**: No org type selection (hotel vs clinic vs resort) — misses personalization opportunity  
**Score**: 7/10 (assumes migration works)

---

### STEP 7: Visitor reaches dashboard
**URL**: /dashboard  
**Verified**: ✅ HTTP 307 (auth redirect works correctly)  
**What they see**: Sidebar navigation, header with role badge, main content with 4 KPI cards, "First five minutes" setup guide  
**Impression**: The "First five minutes" onboarding guide is excellent — it tells users exactly what to do next (Add knowledge → Ask AI → Add contact). Removes decision paralysis.  
**Issue**: Dashboard header shows only the user's name and role badge — no avatar, no profile menu  
**Issue**: No mobile nav — if visitor tries to use on phone, they see content with no navigation  
**Score**: 8/10

---

### STEP 8: Visitor uploads first document
**URL**: /dashboard/knowledge-base  
**Code Path**: DocumentForm → `createDocument()` Server Action → `ingestDocument()` → OpenAI embedding  
**What they see**: Paste area with title field, language selector (English/Arabic)  
**Impression**: Simple and clear. "Each document becomes source material for cited AI answers" — correct expectation setting.  
**Issue**: No file upload (PDF/Word/etc) — text paste only. Users will expect to drag-and-drop existing documents.  
**Issue**: No feedback on embedding progress — form submits and reloads. User doesn't see when embedding is "done."  
**Issue**: "Status: indexing" vs "Status: indexed" — the user never sees an explanation of what these mean  
**Score**: 7/10

---

### STEP 9: Visitor uses AI assistant
**URL**: /dashboard/assistant  
**Code Path**: `fetch("/api/assistant/stream")` → embedding → vector search → OpenAI streaming → SSE  
**Verified**: Code is correct. The streaming implementation is production-quality.  
**What they see**: Chat interface with streaming responses and source panel  
**Impression**: This is the strongest part of the product. Watching text stream in real-time while seeing the source document cited is genuinely impressive.  
**Issue**: Empty initial state text says "Ask about policies, procedures, or guest-facing information from your Knowledge Base." — too generic. Should suggest an actual example question.  
**Issue**: No conversation history on refresh — every session starts empty.  
**Issue**: No message timestamps  
**Issue**: No way to share or export a conversation  
**Score**: 8/10

---

### STEP 10: Visitor creates CRM contact
**URL**: /dashboard/crm  
**Code Path**: QuickAddContact form → `createContact()` Server Action → duplicate check → insert  
**What they see**: Quick-add form at top, contacts table below, pipeline/activities links  
**Impression**: The quick-add form (name, email, phone, company in one row) is fast and intuitive. The table shows status and stage immediately.  
**Issue**: No feedback when contact is successfully created — table just refreshes. Should show a success toast.  
**Issue**: The "Export CSV" link appears twice on the same page (header and table header)  
**Issue**: Stage filter shows raw values ("lead", "qualified") not labels ("Lead", "Qualified") in some places  
**Score**: 8/10

---

### STEP 11: Visitor views billing
**URL**: /dashboard/billing  
**What they see**: Current plan (Free), usage bars, available plans section  
**Issue**: If Stripe not configured: plans show "This plan is not yet available" → blocks revenue conversion  
**Issue**: If migration 0011 not applied: billing_subscriptions query fails → page shows error or incorrect state  
**Issue**: "ManageBillingButton" only shows when org has a Stripe subscription — new users see no billing action  
**Score**: 5/10 (with fixes, 8/10)

---

### STEP 12: Visitor requests demo
**URL**: Landing page → Demo section  
**Code Path**: DemoForm → `submitDemoRequest()` → `sendDemoRequestEmail()` → Resend  
**Issue**: CRITICAL — RESEND_API_KEY missing → form returns "Failed to send your request. Please email us directly at hello@eunoiaos.com"  
**What customer sees**: They filled in their details, clicked "Book a Demo," and got an error message. They leave the booth frustrated. You lost the lead.  
**Score**: 2/10 (0/10 for lead capture)

---

### STEP 13: Visitor invites a team member
**URL**: /dashboard/settings  
**Code Path**: InviteForm → `createInvite()` → generates token → `sendInviteEmail()` → Resend  
**Issue**: Same as above — invite email not delivered without RESEND_API_KEY  
**Issue**: Invitee cannot receive invitation — they have to be sent the invite URL manually  
**Score**: 4/10 (5/10 if RESEND fixed, since manual URL sharing is documented)

---

### STEP 14: Visitor logs out
**Code Path**: `logout()` Server Action → Supabase auth.signOut → redirect to /login  
**Verified**: Code is correct.  
**Score**: 9/10

---

### STEP 15: Visitor leaves (impression formed)
**Overall Impression**: Strong product. The AI streaming is memorable. The CRM pipeline is polished. The branding is professional. The pricing is clear.  
**What will they remember**: The AI chat that answered a hotel policy question in real-time and cited the source.  
**What will concern them**: The demo request form error (if experienced). The missing billing flow.  
**Conversion likelihood**: HIGH (8/10) if demo request works AND AI demo is delivered well.

---

## Friction Point Summary

| Step | Friction Level | Impact | Fix |
|------|----------------|--------|-----|
| Demo request form | CRITICAL | Loses all leads | Add RESEND_API_KEY |
| Billing upgrade | HIGH | No revenue path | Configure Stripe |
| File upload (KB) | MEDIUM | Users have PDFs to upload | Future feature |
| Mobile navigation | HIGH | Unusable on phone | Demo on desktop only |
| Chat history | MEDIUM | Resets on refresh | Don't refresh during demo |
| Email verification | LOW | Minor security gap | Supabase settings |
| Social proof missing | MEDIUM | Trust gap | Add testimonials |
| FAQ role count | LOW | False expectations | Fix copy |

---

## Customer Persona Reactions

### Hotel GM (Decision Maker)
**First reaction**: "This looks like it could actually work for our property."  
**Key question**: "Can I upload our existing SOPs?"  
**Concern**: "Is our data safe from other hotels?"  
**Buying trigger**: Seeing the AI answer a real policy question from their documents.

### Operations Manager (Champion)
**First reaction**: "This would save me the WhatsApp questions I get all day."  
**Key question**: "How long does setup take?"  
**Concern**: "Will my team actually use it?"  
**Buying trigger**: The streaming response demo. "That's faster than WhatsApp."

### IT Manager (Evaluator)
**First reaction**: "What's the security model? Who hosts the data?"  
**Key question**: "Can we integrate with our PMS?"  
**Concern**: "What happens when OpenAI is down?"  
**Buying trigger**: Seeing audit logs and RLS explanation. Supabase infrastructure credibility.

### Investor (Due Diligence)
**First reaction**: "Clean design. What's the tech stack?"  
**Key question**: "What's your ARR? How many customers?"  
**Concern**: "Zero revenue. What's the moat?"  
**Buying trigger**: The RAG pipeline quality + team velocity (375 tests, clean architecture).
