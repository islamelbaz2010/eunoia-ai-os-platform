# SSL Failure — Runbook

**Scenario**: SSL certificate expired or is invalid. Browsers show security warnings.

**Severity**: SEV1 (users see certificate error; most will not proceed)

---

## Diagnose

```bash
# Check certificate expiry
echo | openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null \
  | openssl x509 -noout -dates

# Check from curl (shows SSL error)
curl -v https://yourdomain.com/api/live 2>&1 | grep -i "expire\|invalid\|ssl"
```

---

## Fix A — Renew Let's Encrypt Certificate

### Manual renewal

```bash
sudo certbot renew --cert-name yourdomain.com
sudo nginx -s reload
```

### Force renewal (even if not expired)

```bash
sudo certbot certonly --force-renewal \
  --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com
sudo nginx -s reload
```

### If certbot is not installed

```bash
sudo apt install -y certbot python3-certbot-nginx

# First-time setup
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Fix B — Auto-renewal Setup (prevents future failures)

Add to root crontab (`sudo crontab -e`):

```bash
# Renew Let's Encrypt certificates twice daily (recommended by Certbot)
0 0,12 * * * /usr/bin/certbot renew --quiet --post-hook "nginx -s reload"
```

Verify auto-renewal is working:
```bash
sudo certbot renew --dry-run
```

---

## Fix C — Vercel SSL (automatic)

If hosted on Vercel: SSL is managed automatically. Certificate renewal is fully automatic.

If you see SSL errors on Vercel:
1. Vercel Dashboard → Project → Settings → Domains
2. Check domain status — it should show "Valid Configuration"
3. Click "Refresh" if certificate is pending
4. Wait up to 24 hours for DNS propagation

---

## Verify Recovery

```bash
# Check certificate is valid and not expiring soon
echo | openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null \
  | openssl x509 -noout -dates

# Confirm HTTPS works
curl -v https://yourdomain.com/api/live 2>&1 | grep -E "200|SSL"
```

---

## Prevention

| Action | Command / Location |
|--------|-------------------|
| Auto-renewal cron | `sudo crontab -e` (see above) |
| Monitor expiry | Better Stack → SSL monitoring |
| Alert 30 days before expiry | Configure in uptime monitor |
| Let's Encrypt auto-renew | Certbot handles < 30-day certs automatically |

Let's Encrypt certificates expire every 90 days. With auto-renewal configured, they renew at 60 days remaining, giving 30 days of buffer.
