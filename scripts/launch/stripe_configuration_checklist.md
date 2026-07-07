# Stripe Configuration Checklist

**Purpose**: Ensure Stripe is fully configured before production launch  
**Estimated Time**: 30 minutes  
**Prerequisites**: Stripe account created

---

## Step 1: Create Products and Prices

### Starter Product
- [ ] Log into Stripe Dashboard → Products
- [ ] Click "Add product"
- [ ] Name: `Starter`
- [ ] Description: `Eunoia AI OS Starter Plan`
- [ ] Pricing model: `Standard`
- [ ] Price: `$99` USD
- [ ] Billing interval: `Monthly`
- [ ] Click "Save product"
- [ ] Copy the **Price ID** (starts with `price_`)
- [ ] Add to Vercel as `STRIPE_STARTER_MONTHLY_PRICE_ID`
- [ ] Go back to product → Add another price
- [ ] Price: `$990` USD
- [ ] Billing interval: `Annual` (1 year)
- [ ] Click "Save"
- [ ] Copy the **Price ID**
- [ ] Add to Vercel as `STRIPE_STARTER_ANNUAL_PRICE_ID`

### Pro Product
- [ ] Click "Add product"
- [ ] Name: `Pro`
- [ ] Description: `Eunoia AI OS Pro Plan`
- [ ] Pricing model: `Standard`
- [ ] Price: `$299` USD
- [ ] Billing interval: `Monthly`
- [ ] Click "Save product"
- [ ] Copy the **Price ID**
- [ ] Add to Vercel as `STRIPE_PRO_MONTHLY_PRICE_ID`
- [ ] Go back to product → Add another price
- [ ] Price: `$2,990` USD
- [ ] Billing interval: `Annual` (1 year)
- [ ] Click "Save"
- [ ] Copy the **Price ID**
- [ ] Add to Vercel as `STRIPE_PRO_ANNUAL_PRICE_ID`

---

## Step 2: Configure Webhook Endpoint

- [ ] Navigate to Stripe Dashboard → Developers → Webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://eunoia-ai-os-platform.vercel.app/api/stripe/webhook`
- [ ] Events to listen for (select all):
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `customer.subscription.trial_will_end`
- [ ] Click "Add endpoint"
- [ ] Click on the newly created webhook
- [ ] Scroll to "Signing secret"
- [ ] Click "Reveal" (or copy if already visible)
- [ ] Copy the **Webhook Signing Secret** (starts with `whsec_`)
- [ ] Add to Vercel as `STRIPE_WEBHOOK_SECRET`

---

## Step 3: Enable Customer Portal

- [ ] Navigate to Stripe Dashboard → Settings → Customer Portal
- [ ] Click "Configuration" tab
- [ ] Enable the following features:
  - [ ] `Update subscription` (allow plan changes)
  - [ ] `Cancel subscription` (allow self-service cancellation)
  - [ ] `Update payment method` (allow card updates)
  - [ ] `View invoice history` (allow invoice downloads)
- [ ] Click "Save"
- [ ] (Optional) Customize branding and preset options

---

## Step 4: Copy API Keys

- [ ] Navigate to Stripe Dashboard → Developers → API Keys
- [ ] Locate "Secret key" (starts with `sk_live_` for production, `sk_test_` for test)
- [ ] Click "Reveal" and copy the key
- [ ] Add to Vercel as `STRIPE_SECRET_KEY`
- [ ] Locate "Publishable key" (starts with `pk_live_` for production, `pk_test_` for test)
- [ ] Copy the key
- [ ] Add to Vercel as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## Step 5: Verify Environment Variables in Vercel

Run the verification script:
```bash
./scripts/launch/verify_vercel_env.sh
```

Or manually verify in Vercel Dashboard:
- [ ] Go to Vercel → Project → Settings → Environment Variables
- [ ] Verify all 7 Stripe variables are set:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_STARTER_MONTHLY_PRICE_ID`
  - [ ] `STRIPE_STARTER_ANNUAL_PRICE_ID`
  - [ ] `STRIPE_PRO_MONTHLY_PRICE_ID`
  - [ ] `STRIPE_PRO_ANNUAL_PRICE_ID`

---

## Step 6: Test Webhook Delivery

- [ ] In Stripe Dashboard → Developers → Webhooks
- [ ] Click on your webhook endpoint
- [ ] Click "Send test webhook"
- [ ] Select event: `checkout.session.completed`
- [ ] Click "Send test webhook"
- [ ] Check Vercel logs for the webhook endpoint
- [ ] Verify the webhook returns HTTP 200
- [ ] Verify no errors in the logs

---

## Step 7: Test Checkout Flow (Optional but Recommended)

- [ ] Deploy to production
- [ ] Sign up as a test user
- [ ] Navigate to `/dashboard/billing`
- [ ] Click "Upgrade to Starter"
- [ ] Verify redirect to Stripe Checkout
- [ ] Complete test payment (in test mode)
- [ ] Verify webhook fires
- [ ] Verify subscription is active in database
- [ ] Verify plan limits are applied

---

## Summary Checklist

- [ ] Starter product created with monthly price
- [ ] Starter product created with annual price
- [ ] Pro product created with monthly price
- [ ] Pro product created with annual price
- [ ] All 4 price IDs added to Vercel
- [ ] Webhook endpoint registered
- [ ] All 7 webhook events selected
- [ ] Webhook signing secret added to Vercel
- [ ] Customer Portal enabled
- [ ] Secret key added to Vercel
- [ ] Publishable key added to Vercel
- [ ] Test webhook sent successfully
- [ ] Checkout flow tested end-to-end

---

## Troubleshooting

**Webhook returns 404**:  
- Verify the endpoint URL is exactly `https://eunoia-ai-os-platform.vercel.app/api/stripe/webhook`
- Check Vercel deployment logs for the route

**Webhook signature verification fails**:  
- Verify `STRIPE_WEBHOOK_SECRET` is correct in Vercel
- Ensure you're using the correct secret (test vs live mode)

**Checkout fails with "Billing not configured"**:  
- Verify all 7 Stripe environment variables are set in Vercel
- Check that the price IDs match your Stripe products

**Customer Portal not accessible**:  
- Verify the organization has a `stripe_customer_id` in the database
- Check that the webhook successfully processed the checkout
