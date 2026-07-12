# VERTICAL SCORING
**Would you demo this product to each vertical? YES or NO with reasoning.**

---

## Scoring Criteria

For each vertical, I assess:
1. **Feature fit** — does the product solve the primary pain point?
2. **Demo quality** — can we deliver a convincing 5-minute demo to this audience?
3. **Sales objections** — what are the main blockers to conversion?
4. **Revenue potential** — how fast can they close?

---

## VERTICAL 1: Hotels & Luxury Resorts

**VERDICT: YES — Primary target. Demo with confidence.**

**Feature fit**: 10/10
- Knowledge Base + RAG directly solves the "WhatsApp question" problem
- CRM is designed for travel agent and corporate account management
- Staff knowledge access is the core use case
- Arabic support is critical for Egyptian and GCC hotel staff

**Demo quality**: 9/10
- The AI streaming demo is most memorable with hotel-specific questions
- "What is the VIP guest protocol?" is a question every hotel GM understands
- Real-time source citations build trust ("it's not making this up")

**Sales objections**:
- "We already have a knowledge base (shared drive/intranet)" → answer: can your intranet answer a question in 3 seconds with a source?
- "Staff won't adopt it" → answer: simpler than WhatsApp
- "What about data security?" → answer: RLS isolation, data doesn't leave your org

**Revenue potential**: HIGH. $99-299/mo. Fast decision cycle for independent properties. Longer cycle for chains.

**Exhibition conversion likelihood**: HIGH (7/10)

---

## VERTICAL 2: Travel Agencies

**VERDICT: YES — Strong secondary fit.**

**Feature fit**: 8/10
- Visa requirement knowledge base is a compelling RAG use case
- Package terms and supplier contract retrieval solves real consultant problems
- CRM pipeline matches the client booking journey
- The AI handles frequently-changing visa data if documents are updated

**Demo quality**: 7/10
- Need to tailor the suggested questions: "What documents does an Egyptian passport holder need for a Schengen visa?"
- CRM demo for client-pipeline management is secondary but visible

**Sales objections**:
- "Travel regulations change constantly" → answer: update the document, AI answer updates immediately
- "We use GDS for booking" → answer: Eunoia is the knowledge layer, not the booking layer
- "Do you have visa information pre-loaded?" → answer: No, you upload your agency's verified procedures

**Revenue potential**: MEDIUM. Travel agencies vary widely in size and tech-sophistication. Independent agencies are the fastest close.

**Exhibition conversion likelihood**: MEDIUM (5/10)

---

## VERTICAL 3: Real Estate Agencies

**VERDICT: YES — CRM-led pitch.**

**Feature fit**: 8/10
- CRM pipeline is a natural fit (lead → viewing → offer → contract → closed)
- Knowledge base for payment plans, developer terms, and unit specs
- Activity tracking and follow-up management solve real agent pain
- CSV import lets them load existing contact lists

**Demo quality**: 7/10
- Lead with the CRM pipeline board, not the AI chat
- Ask: "What's the payment plan for Villa 3B in Marina Phase 2?" — strong demo question
- The pipeline drag-and-drop is visually impressive

**Sales objections**:
- "We already use a CRM (Excel/Odoo/HubSpot Starter)" → answer: which one answers your developer term questions from actual contract PDFs?
- "Our agents work on mobile" → answer: (honest) dashboard requires desktop currently. Mobile is on roadmap.
- "Can we track properties, not just contacts?" → answer: document properties in KB; track buyers in CRM

**Revenue potential**: MEDIUM-HIGH. Decision cycle is faster than hotel (one person can approve). The $99 Starter is below budget sensitivity for mid-size agencies.

**Exhibition conversion likelihood**: MEDIUM-HIGH (6/10)

---

## VERTICAL 4: Medical Clinics

**VERDICT: YES — with caveats. Position carefully.**

**Feature fit**: 8/10
- Insurance procedure knowledge base is the primary use case
- Receptionist training and protocol access is a strong pain point
- Audit logs matter for medical compliance (can see who accessed what protocol)
- **CRITICAL**: Never claim HIPAA compliance or suitability for patient data. Position as operational knowledge only (procedures, not records).

**Demo quality**: 7/10
- "What documents does a patient need for Bupa insurance claims?" is a great demo question
- Audit logs are a differentiator for compliance-conscious clinics
- Avoid demoing contact management as "patient management" — it's for staff and leads

**Sales objections**:
- "This could expose patient data" → answer: patient data NEVER enters Eunoia. Protocols only.
- "We have an intranet" → answer: can your staff ask it a question in Arabic and get a cited answer?
- "IT needs to approve this" → answer: hand them the security fact sheet; RLS + Supabase infrastructure

**Revenue potential**: MEDIUM. Single-location clinics (Starter $99) are a fast close. Multi-branch clinics need a longer sales cycle. Avoid national hospital chains at this stage.

**Exhibition conversion likelihood**: MEDIUM (5/10)

---

## VERTICAL 5: Restaurant Chains

**VERDICT: YES — Allergen and menu knowledge is high-urgency.**

**Feature fit**: 8/10
- Menu knowledge (allergens, ingredients, dietary flags) is a genuine liability issue
- Seasonal specials and pricing updates reach all staff immediately
- Staff training via KB reduces new-hire ramp time
- CRM less relevant for pure restaurant; stronger for F&B corporate sales

**Demo quality**: 8/10
- "Does the sea bass contain gluten?" is an instantly understood demo question
- The credibility of "it reads from your menu, not the internet" lands well
- Rapid upload → instant answers is visible in 60 seconds

**Sales objections**:
- "Servers can't use their phones on the floor" → answer: they're already using them; this makes it productive
- "Our menu changes daily" → answer: update the document; AI updates in minutes
- "We use a POS system for this" → answer: POS manages orders; this manages knowledge

**Revenue potential**: MEDIUM. Single-restaurant owners can close at $99/mo at the booth. Chains need a longer decision cycle but higher contract value.

**Exhibition conversion likelihood**: MEDIUM (5/10)

---

## VERTICAL 6: Investors (Pre-Seed / Seed)

**VERDICT: YES — Demo the product AND the architecture.**

**Feature fit (for investor pitch)**: 9/10
- The product is technically impressive and actually works
- The AI pipeline is production-quality RAG, not a ChatGPT wrapper
- The test suite (375 tests) and zero TypeScript errors demonstrate engineering discipline
- The security model (RLS + RBAC + audit logs) is enterprise-grade

**Demo quality for investors**: 8/10
- Show the streaming AI demo — visually memorable
- Show the health dashboard (`/api/health`) — demonstrates production thinking
- Show the billing page — shows revenue intent
- **Tell the honest story**: Pre-revenue. First commercial push today. Stripe billing built but not yet activated. 375 tests. Live in production.

**Investor objections**:
- "Zero customers" → "This exhibition is the first commercial push. We built a production-ready platform before going to market, not the other way around."
- "What's your moat?" → "MENA regional focus, Arabic-first UX, integrated KB+CRM stack, and speed to value (live in 2 hours)"
- "What's the team size?" → Be honest
- "What's your CAC?" → "Unknown — this is Day 1 of sales. Demo request form is primary lead capture."

**Revenue potential**: HIGH impact. One investor conversation could change the company's trajectory.

**Exhibition conversion likelihood**: MEDIUM (4/10 for check that day, 7/10 for follow-on meeting)

---

## VERTICAL 7: Enterprise (Hotel Groups, Multi-Property Chains)

**VERDICT: NOT YET — Come back in 90 days.**

**Feature fit**: 7/10
- Org switcher exists and works
- Multi-property workspaces are possible (each property = separate org)
- Enterprise plan has correct limits (unlimited members, SSO planned)

**Gaps for enterprise**:
- SSO/SAML: listed in Enterprise plan but not implemented yet
- Audit export: logs exist but no export API
- Custom integrations: none exist
- SLA guarantee: not formally established
- Multi-property billing consolidation: not built

**Demo quality**: 5/10
- Can demo the product at enterprise scale conceptually
- Can't demo SSO or multi-property management in practice

**When to come back**: After 10 paying customers, with an SLA document, and SSO implementation.

**Exhibition strategy**: If a hotel chain executive approaches, collect contact info and schedule a custom demo in 2 weeks. Do NOT try to demo the enterprise tier live — you'll expose the gaps.

---

## Summary Table

| Vertical | Demo? | Confidence | Revenue Speed | Score |
|----------|-------|-----------|--------------|-------|
| Hotels & Luxury Resorts | ✅ YES | High | Fast | 9/10 |
| Travel Agencies | ✅ YES | Medium | Medium | 7/10 |
| Real Estate Agencies | ✅ YES | Medium-High | Fast-Medium | 7/10 |
| Medical Clinics | ✅ YES (carefully) | Medium | Medium | 6/10 |
| Restaurant Chains | ✅ YES | Medium | Fast-Medium | 7/10 |
| Investors | ✅ YES | High | Slow | 8/10 |
| Enterprise (Chains) | ❌ NOT YET | Low | Very Slow | 3/10 |
