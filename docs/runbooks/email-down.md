# Email Down — Runbook

**Trigger**: `health_provider_up{provider="email"} == 0`  
OR users report invite emails not being received

**Severity**: SEV3 (non-critical — invites fail silently, core features unaffected)

Email delivery uses [Resend](https://resend.com). A failure means team invite emails are not sent. The invite link can still be shared manually.

---

## Diagnosis

```bash
curl https://yourdomain.com/api/health | jq '.providers.email'
```

Check Resend status: [resend-status.com](https://resend-status.com)

---

## Mitigation

### Option A — Re-send Invite Manually

If email is down and a user needs an invite:
1. Admin generates the invite in Settings → Team
2. Copy the invite token from the `org_invites` table in Supabase
3. Share the link manually: `https://yourdomain.com/invite?token=<token>`

### Option B — Check RESEND_API_KEY

```bash
# Test Resend API directly
curl -X POST "https://api.resend.com/emails" \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"test@yourdomain.com","to":"test@example.com","subject":"Test","html":"Hello"}' | jq .
```

If the response is `403 Unauthorized`:
1. Go to [resend.com/api-keys](https://resend.com/api-keys) → generate a new key
2. Update `RESEND_API_KEY` in Vercel dashboard
3. Redeploy

### Option C — Check FROM_EMAIL Format

The `FROM_EMAIL` variable must follow the format: `Name <email@domain.com>` where the email matches your verified Resend domain.

```bash
echo $FROM_EMAIL
# Expected: Eunoia AI OS <noreply@yourdomain.com>
```

If the domain is not verified in Resend, all sends will fail silently.

### Disable Provider (Suppress Noise)

```
ENABLE_EMAIL_HEALTH=false
```

---

## Verification

```bash
curl https://yourdomain.com/api/health | jq '.providers.email'
# Expected: { "status": "configured", "latency_ms": 0 }
```

Test end-to-end: create an invite in Settings → confirm the email arrives.
