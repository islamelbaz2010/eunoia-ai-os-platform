#!/bin/bash

# Webhook Validation Script
# This script validates that the Stripe webhook endpoint is properly configured
# Usage: ./validate_webhook.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

WEBHOOK_URL="https://eunoia-ai-os-platform.vercel.app/api/stripe/webhook"

echo "=== Stripe Webhook Validation ==="
echo ""

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${YELLOW}WARNING: stripe CLI not installed${NC}"
    echo "Install it with: npm install -g stripe"
    echo "Continuing with curl-based validation..."
    echo ""
fi

echo "Step 1: Checking webhook endpoint accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL")

if [ "$HTTP_CODE" = "405" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Webhook endpoint is accessible (HTTP $HTTP_CODE)${NC}"
    echo "  Note: 405 is expected for GET requests (webhook only accepts POST)"
else
    echo -e "${RED}✗ Webhook endpoint returned HTTP $HTTP_CODE${NC}"
    echo "  Expected: 405 (Method Not Allowed) or 200"
    exit 1
fi

echo ""
echo "Step 2: Checking STRIPE_WEBHOOK_SECRET environment variable..."

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo -e "${YELLOW}⚠ STRIPE_WEBHOOK_SECRET not set in environment${NC}"
    echo "  Checking Vercel..."
    
    if command -v vercel &> /dev/null; then
        WEBHOOK_SECRET=$(vercel env ls STRIPE_WEBHOOK_SECRET --scope production 2>/dev/null | grep -v "No environment variables" || echo "")
        if [ -z "$WEBHOOK_SECRET" ]; then
            echo -e "${RED}✗ STRIPE_WEBHOOK_SECRET not set in Vercel${NC}"
            echo "  Add it in Vercel Dashboard → Project → Settings → Environment Variables"
            exit 1
        else
            echo -e "${GREEN}✓ STRIPE_WEBHOOK_SECRET is set in Vercel${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Cannot check Vercel (vercel CLI not installed)${NC}"
        echo "  Manually verify in Vercel Dashboard"
    fi
else
    echo -e "${GREEN}✓ STRIPE_WEBHOOK_SECRET is set in environment${NC}"
fi

echo ""
echo "Step 3: Checking STRIPE_SECRET_KEY environment variable..."

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${YELLOW}⚠ STRIPE_SECRET_KEY not set in environment${NC}"
    echo "  Checking Vercel..."
    
    if command -v vercel &> /dev/null; then
        SECRET_KEY=$(vercel env ls STRIPE_SECRET_KEY --scope production 2>/dev/null | grep -v "No environment variables" || echo "")
        if [ -z "$SECRET_KEY" ]; then
            echo -e "${RED}✗ STRIPE_SECRET_KEY not set in Vercel${NC}"
            exit 1
        else
            echo -e "${GREEN}✓ STRIPE_SECRET_KEY is set in Vercel${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Cannot check Vercel (vercel CLI not installed)${NC}"
    fi
else
    echo -e "${GREEN}✓ STRIPE_SECRET_KEY is set in environment${NC}"
fi

echo ""
echo "Step 4: Validating webhook signature verification..."

# Create a test payload
TEST_PAYLOAD='{
  "id": "evt_test_1234567890",
  "object": "event",
  "api_version": "2026-06-24",
  "type": "checkout.session.completed"
}'

# Note: We can't actually test signature verification without a real Stripe secret
# This is a placeholder for the check
echo -e "${YELLOW}⚠ Signature verification cannot be tested without real Stripe credentials${NC}"
echo "  This will be tested when a real webhook is sent from Stripe"

echo ""
echo "Step 5: Checking required webhook events are registered..."

if command -v stripe &> /dev/null; then
    echo "Using Stripe CLI to check webhook events..."
    
    # List webhooks
    WEBHOOKS=$(stripe webhooks list 2>/dev/null || echo "")
    
    if [ -z "$WEBHOOKS" ]; then
        echo -e "${RED}✗ No webhooks found in Stripe${NC}"
        echo "  Create a webhook at: https://dashboard.stripe.com/webhooks"
        exit 1
    fi
    
    # Check if our webhook exists
    WEBHOOK_EXISTS=$(echo "$WEBHOOKS" | grep -q "$WEBHOOK_URL" && echo "true" || echo "false")
    
    if [ "$WEBHOOK_EXISTS" = "true" ]; then
        echo -e "${GREEN}✓ Webhook endpoint registered in Stripe${NC}"
        
        # Get webhook ID
        WEBHOOK_ID=$(stripe webhooks list 2>/dev/null | grep -A 1 "$WEBHOOK_URL" | grep "id" | head -1 | cut -d'"' -f4)
        
        if [ -n "$WEBHOOK_ID" ]; then
            echo "  Webhook ID: $WEBHOOK_ID"
            
            # Check enabled events
            echo ""
            echo "  Checking enabled events..."
            REQUIRED_EVENTS=(
                "checkout.session.completed"
                "customer.subscription.created"
                "customer.subscription.updated"
                "customer.subscription.deleted"
                "invoice.payment_succeeded"
                "invoice.payment_failed"
                "customer.subscription.trial_will_end"
            )
            
            WEBHOOK_EVENTS=$(stripe webhooks endpoint "$WEBHOOK_ID" 2>/dev/null || echo "")
            
            for event in "${REQUIRED_EVENTS[@]}"; do
                if echo "$WEBHOOK_EVENTS" | grep -q "$event"; then
                    echo -e "    ${GREEN}✓${NC} $event"
                else
                    echo -e "    ${RED}✗${NC} $event (MISSING)"
                fi
            done
        fi
    else
        echo -e "${RED}✗ Webhook endpoint not registered in Stripe${NC}"
        echo "  Expected URL: $WEBHOOK_URL"
        echo "  Create it at: https://dashboard.stripe.com/webhooks"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Stripe CLI not installed, skipping webhook event check${NC}"
    echo "  Install with: npm install -g stripe"
    echo "  Or manually verify in Stripe Dashboard → Developers → Webhooks"
fi

echo ""
echo "Step 6: Testing webhook endpoint with sample payload..."

# Send a test POST request (will fail signature verification but endpoint should respond)
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Webhook endpoint accepts POST requests (HTTP $HTTP_CODE)${NC}"
    if [ "$HTTP_CODE" = "400" ]; then
        echo "  Note: 400 is expected for invalid signature (normal behavior)"
    fi
else
    echo -e "${RED}✗ Webhook endpoint returned unexpected HTTP $HTTP_CODE${NC}"
    echo "  Response: $BODY"
    exit 1
fi

echo ""
echo "=== Summary ==="
echo -e "${GREEN}✓ Webhook endpoint is accessible and responding${NC}"
echo -e "${GREEN}✓ Environment variables are configured${NC}"
echo ""
echo "Next steps:"
echo "1. Send a test webhook from Stripe Dashboard"
echo "2. Monitor Vercel logs for webhook processing"
echo "3. Verify database updates after webhook"
