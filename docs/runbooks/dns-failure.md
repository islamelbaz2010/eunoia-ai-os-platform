# DNS Failure — Runbook

**Scenario**: Domain is not resolving, or DNS propagation is broken.

**Severity**: SEV1 (users cannot reach the application)

---

## Diagnose

```bash
# Check DNS resolution
nslookup yourdomain.com
dig yourdomain.com A

# Check from multiple resolvers
dig @1.1.1.1 yourdomain.com A    # Cloudflare
dig @8.8.8.8 yourdomain.com A    # Google

# Check if the app is up (bypassing DNS)
curl -H "Host: yourdomain.com" http://<server-ip>/api/live
```

---

## Common Causes and Fixes

### 1. DNS record missing or wrong

- Log into your DNS provider (Cloudflare, Route 53, Namecheap, etc.)
- Verify A record: `yourdomain.com → <server-ip>`
- Verify CNAME: `www.yourdomain.com → yourdomain.com`
- For Vercel: verify CNAME points to `cname.vercel-dns.com`

### 2. Domain expired

- Check expiry: `whois yourdomain.com | grep -i expir`
- Renew immediately with your registrar
- DNS changes may take up to 48 hours to propagate

### 3. Cloudflare proxy issue

- Temporarily bypass Cloudflare: set DNS record to "DNS only" (grey cloud)
- Confirm app is accessible via direct IP
- Re-enable proxy once issue is identified

### 4. TTL too high during migration

During a server IP change, high TTL means old IP is cached:
- Set TTL to 60 seconds BEFORE changing the IP
- Change IP
- Wait for old TTL to expire
- Set TTL back to 300 seconds

---

## Verify Recovery

```bash
dig yourdomain.com A | grep -A1 "ANSWER SECTION"
curl https://yourdomain.com/api/live
```

---

## Prevention

- Set TTL to 300 seconds (5 minutes) for production records
- Monitor DNS with uptime checker (Better Stack monitors DNS resolution separately)
- Keep domain auto-renew enabled
- Use Cloudflare for DDoS protection and fast propagation
