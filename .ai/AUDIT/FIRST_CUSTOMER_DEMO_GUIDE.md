# FIRST CUSTOMER DEMO GUIDE
**Repository**: eunoia-ai-os-platform  
**Date**: 2026-07-07  
**Audience**: Hospitality (hotels, resorts, diving centers — Egypt, UAE, Saudi Arabia)  
**Demo duration**: 20 minutes  
**Pre-requisites**: Migration 0007+0008+0009 applied; RESEND_API_KEY set; seed data loaded

---

## PRE-DEMO SETUP (30 minutes before)

### 1. Seed Demo Organization

Run the seed script (create if not exists):

```bash
# Create a demo org with realistic hospitality data
npm run seed:demo
# This should create:
# - Organization: "Grand Nile Tower Hotel"
# - 5 CRM contacts (2 travel agents, 2 corporate clients, 1 VIP guest)
# - 3 KB documents:
#     "Guest Check-In Policy"
#     "F&B Menu and Pricing"
#     "Diving Center Safety Protocol"
# - 1 admin user: demo@eunoiaos.com / Demo1234!
```

If seed script doesn't exist yet, manually:
1. Sign up with `demo@eunoiaos.com`
2. Create org "Grand Nile Tower Hotel"
3. Add 3 KB documents (use content from the demo scripts below)
4. Add 5 CRM contacts

### 2. Pre-Warm the AI

Open the assistant and ask one question before the demo starts.  
This prevents the cold-start delay from appearing during the demo.

### 3. Open These Tabs in Order

1. Tab 1: Landing page `https://eunoia-ai-os-platform.vercel.app`
2. Tab 2: Dashboard `https://eunoia-ai-os-platform.vercel.app/dashboard`
3. Tab 3: Knowledge Base
4. Tab 4: AI Assistant
5. Tab 5: CRM

---

## DEMO SCRIPT (20 minutes)

### ACT 1: THE PROBLEM (2 minutes)

**Say**:
> "Your team answers the same 50 questions every day. Check-in policies. F&B hours. Diving packages. Group rates. Every manager has their own version of the answer. New staff take 3 months to know everything your best people know on day 1."
>
> "Eunoia AI OS fixes this. Your property's knowledge goes in once. Every team member gets the right answer instantly — in any language."

**Show**: Landing page (Tab 1)

---

### ACT 2: THE KNOWLEDGE BASE (4 minutes)

**Navigate to**: Tab 3 — Knowledge Base

**Say**:
> "This is where your property's knowledge lives. Policies, menus, protocols, pricing — anything text-based."

**Demo action**:
1. Click "Add document"
2. Title: "VIP Guest Protocol — Ramadan 2027"
3. Paste content (have this pre-written):
   ```
   VIP Guest Check-In During Ramadan:
   - Early check-in available from 1 PM for VIP guests (standard is 3 PM)
   - Complimentary dates and Arabic coffee upon arrival
   - Suhoor room service available 2 AM to 4 AM at no charge for suites
   - Prayer schedule cards in all rooms
   - Qibla direction marked on room map
   ```
4. Click "Save" — document appears instantly
5. Click the document — show it's there, searchable

**Say**:
> "The AI indexed that in under 2 seconds. It's now available to answer questions."

---

### ACT 3: THE AI ASSISTANT (6 minutes)

**Navigate to**: Tab 4 — AI Assistant

**Say**:
> "This is where the magic is. Your team asks questions. Eunoia finds the answer — from your documents, not from the internet."

**Demo question 1** (confident, fast answer):
> Ask: "What time can VIP guests check in during Ramadan?"

Wait for response. Show source panel.

> "See the source citation? It's not guessing. It found that answer in the document we just uploaded. Every answer is traceable."

**Demo question 2** (multi-document):
> Ask: "Do we offer early check-in for group bookings from travel agents?"

This tests cross-document retrieval.

**Demo question 3** (boundary test — shows honesty):
> Ask: "What is our policy on pet stays?"

Expected response: "I couldn't find anything about pet policies in the Knowledge Base."

> "It doesn't hallucinate. If the answer isn't in your Knowledge Base, it tells you — so you can add the policy."

**Say**:
> "Your team gets this assistant 24/7. No waiting for the manager. No wrong answers. This is the knowledge your best people have, available to everyone."

---

### ACT 4: THE CRM (4 minutes)

**Navigate to**: Tab 5 — CRM

**Say**:
> "Alongside AI, your team needs to track relationships. This is your CRM, built for hospitality."

**Demo actions**:
1. Show the pipeline board — lead → qualified → won
2. Click on a contact — show the timeline: notes, calls, activities
3. Show "Add activity" — create a follow-up call for a travel agent
4. Show the AI insights tab on the contact

> "Your sales team logs every interaction here. When your GM asks 'where is the Heliopolis travel agency deal?', you open this."

---

### ACT 5: TEAM COLLABORATION (2 minutes)

**Navigate to**: Settings

**Say**:
> "Invite your team. Roles control what they can see and do."

**Demo action**:
1. Show the role options (owner, admin, manager, operator, viewer)
2. Type a fake email, select "Manager" role, click Invite
3. Show the invite was sent

> "Your F&B manager sees the menu knowledge. Your diving instructor sees the safety protocols. Your GM sees everything."

---

### ACT 6: THE CLOSE (2 minutes)

**Navigate to**: Dashboard (Tab 2)

**Say**:
> "Everything is tracked. Usage, queries, contacts, documents. You always know how your team is using the system."

**Then**:
> "We built this specifically for hospitality properties in Egypt, the UAE, and Saudi Arabia. We understand your languages, your seasons, your guest expectations."
>
> "The Starter plan is $99 per month — that's 5 team members, unlimited AI queries, full CRM. What questions do you have?"

---

## DEMO OBJECTION RESPONSES

| Objection | Response |
|-----------|----------|
| "Our staff doesn't use apps" | "It works on any phone browser. No download." |
| "What about Arabic content?" | "The Knowledge Base supports Arabic documents. The AI reads and answers in Arabic." |
| "Is our data safe?" | "Your data is isolated to your organization by row-level security. It is never shared or used to train AI models." |
| "How long to set up?" | "You can be live in an afternoon. Load your documents, invite your team, done." |
| "What if the AI is wrong?" | "It cites its sources. If a source is wrong, you update the document and it's fixed instantly." |
| "We already have an intranet" | "Your intranet requires staff to search. This answers. There's a difference." |

---

## DEMO FAILURE RECOVERY

| Failure | Recovery |
|---------|----------|
| AI returns "I don't know" on a question that should work | "Let me add that policy right now." — open KB, add content, re-ask |
| "Thinking..." lasts more than 10 seconds | "Network hiccup — let me refresh" — have a screenshot backup |
| Invite fails | "The email will arrive in a minute — let me show you the Settings meanwhile" |
| Page doesn't load | Have a recorded Loom walkthrough as backup |

---

## POST-DEMO FOLLOW-UP

Within 2 hours of demo:
1. Send a follow-up email with pricing details
2. Create a CRM contact for the prospect
3. Log the demo as a timeline event
4. Set a follow-up activity for 3 days out
