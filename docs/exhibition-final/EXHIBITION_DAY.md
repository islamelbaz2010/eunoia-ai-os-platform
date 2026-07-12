# Exhibition Day Checklist
**Eunoia AI OS — Live Demo Day**

---

## Critical Info

```
Production URL:  https://eunoia-ai-os-platform.vercel.app
Demo email:      demo@eunoiaos.com
Demo password:   EunoiaDemo2026!
Demo org:        Grand Nile Tower Hotel
```

---

## T-3 Hours (Evening Before)

- [ ] Charge laptop to 100%
- [ ] Charge phone to 100% (for hotspot backup)
- [ ] Confirm venue WiFi SSID and password
- [ ] Run: `./scripts/exhibition/launch.sh --skip-bootstrap`
- [ ] Run: `./scripts/exhibition/prepare-demo.sh`
- [ ] Open browser tab: https://eunoia-ai-os-platform.vercel.app
- [ ] Test demo login manually: demo@eunoiaos.com / EunoiaDemo2026!
- [ ] Run one AI query: "What is the VIP late checkout policy?"
- [ ] Confirm dashboard charts show activity data
- [ ] Print this checklist

---

## T-1 Hour

- [ ] Run: `bash scripts/exhibition/verify.sh --fast`
  - Should show: PASS 43, WARN 8, FAIL 0
- [ ] Hit production health: https://eunoia-ai-os-platform.vercel.app/api/health
  - Should return: `{"status":"ready",...}`
- [ ] Open demo account in browser — stay logged in
- [ ] Set browser to fullscreen (F11 or Cmd+Ctrl+F)
- [ ] Close all unnecessary browser tabs
- [ ] Enable Do Not Disturb on phone and laptop
- [ ] Disable browser notifications

---

## T-15 Minutes

- [ ] Log in to demo account if session expired
- [ ] Navigate to Dashboard — confirm charts visible
- [ ] Navigate to Knowledge Base — confirm 5 documents listed
- [ ] Navigate to CRM — confirm 6 contacts in pipeline view
- [ ] Navigate to Assistant — type "What is the VIP late checkout policy?" — confirm streaming response
- [ ] Have signup URL ready: https://eunoia-ai-os-platform.vercel.app/signup

---

## 5-Minute Investor Demo Flow

**Total time: ~5 minutes. Practice this sequence.**

### Minute 0:00 — Landing Page (30 sec)
- Open: https://eunoia-ai-os-platform.vercel.app
- Say: "This is Eunoia AI OS — the operating system for hospitality teams."
- Point to: headline, country badges (Egypt, UAE, Saudi Arabia)
- Click: Pricing (show $99/$299/Custom)
- Click: Start Free Trial

### Minute 0:30 — AI Assistant Demo (2 min)
- Log in: demo@eunoiaos.com / EunoiaDemo2026!
- Navigate to: Assistant (sidebar)
- Ask: **"What are the VIP late checkout rules?"**
  - Expected: Streaming answer citing VIP Guest Protocol, with exact policy details
- Ask: **"Does the sea bass dish contain dairy?"**
  - Expected: Yes, mentions saffron cauliflower purée + caperberry butter sauce
- Point to: source citations below the answer

### Minute 2:30 — Knowledge Base (45 sec)
- Navigate to: Knowledge Base
- Show: 5 documents (VIP Protocol, F&B Menu, Check-in/out, Emergency, Staff Grooming)
- Say: "Each document is chunked and embedded — that's why the AI gives cited, accurate answers."

### Minute 3:15 — CRM Pipeline (1 min)
- Navigate to: CRM
- Show: 6 contacts at different stages (lead → qualified → proposal → negotiation → won)
- Point to: Marco Villas (Won), Sarah Mitchell (Rotana — evaluating 3 properties)
- Say: "Every lead from the exhibition goes here — we never lose a follow-up."

### Minute 4:15 — Dashboard Analytics (30 sec)
- Navigate to: Dashboard (Overview)
- Show: charts, KPIs, activity feed
- Say: "Team usage, AI query volume, CRM activity — all in one place."

### Minute 4:45 — Close (15 sec)
- Say: "Live in 2 hours. No IT team needed. Starting at $99/month."
- Hand over phone or open: /signup

---

## If Something Goes Wrong

### WiFi Drops
1. Activate phone hotspot immediately
2. Connect laptop to hotspot
3. Reload page — app is fully cloud-hosted, no local state

### Demo Account Locked / Password Wrong
```
Email:    demo@eunoiaos.com
Password: EunoiaDemo2026!
```
If login fails, run: `npx tsx scripts/exhibition/seed-demo.ts --reset`

### AI Assistant Not Responding
- Check: https://eunoia-ai-os-platform.vercel.app/api/health
- If degraded: say "Let me show you the Knowledge Base while the AI service recovers"
- AI rate limit: 50 queries/user/hour — very unlikely to hit in demo

### Browser Crash
1. Reopen browser
2. Navigate to: https://eunoia-ai-os-platform.vercel.app/login
3. Log in with demo credentials
4. Resume from current demo step

### Page Looks Wrong / Cached
- Press: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) to hard refresh

---

## Post-Exhibition (Same Day)

- [ ] Collect all business cards / contact details
- [ ] Log each contact in CRM: https://eunoia-ai-os-platform.vercel.app/dashboard/crm
- [ ] Send follow-up email within 24 hours
- [ ] Run: `./scripts/exhibition/seed-demo.sh` to refresh demo data for next day
- [ ] Commit exhibition notes to `docs/exhibition-live/`

---

## Key Demo Questions & Answers

**"How long does setup take?"**
> 2 hours. You upload your documents, invite your team, and the AI starts answering questions.

**"Is the data secure?"**
> Every organization sees only their own data. Row-level security enforced at the database level (Supabase/PostgreSQL). Hosted on Vercel with HSTS, CSP, and no cross-tenant access possible.

**"Does it support Arabic?"**
> Yes. The AI answers in the language of the question. English and Arabic both supported.

**"What happens to our documents?"**
> They're stored in your organization's isolated namespace. We never use your data to train models. OpenAI processes queries in real-time with no data retention.

**"Can we try it now?"**
> Absolutely. https://eunoia-ai-os-platform.vercel.app/signup — live in 2 minutes.

---

*Generated: 2026-07-13 | Exhibition Hardening Sprint*
