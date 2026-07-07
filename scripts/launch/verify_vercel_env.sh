#!/bin/bash

# Vercel Environment Verification Script
# This script verifies all required environment variables are set in Vercel
# Usage: ./verify_vercel_env.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Vercel Environment Verification ==="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}ERROR: vercel CLI not installed${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

# Check if logged in
echo "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}ERROR: Not logged into Vercel${NC}"
    echo "Run: vercel login"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated with Vercel${NC}"
echo ""

# Required environment variables
declare -a REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "OPENAI_API_KEY"
    "NEXT_PUBLIC_APP_URL"
)

# Stripe variables (required for billing)
declare -a STRIPE_VARS=(
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "STRIPE_STARTER_MONTHLY_PRICE_ID"
    "STRIPE_STARTER_ANNUAL_PRICE_ID"
    "STRIPE_PRO_MONTHLY_PRICE_ID"
    "STRIPE_PRO_ANNUAL_PRICE_ID"
)

# Email variables (required for invites)
declare -a EMAIL_VARS=(
    "RESEND_API_KEY"
    "FROM_EMAIL"
    "DEMO_REQUEST_EMAIL"
)

# Error tracking variables
declare -a SENTRY_VARS=(
    "NEXT_PUBLIC_SENTRY_DSN"
    "SENTRY_DSN"
)

# Security variables
declare -a SECURITY_VARS=(
    "METRICS_TOKEN"
)

# Variables that should NEVER be in Vercel
declare -a FORBIDDEN_VARS=(
    "SUPABASE_SERVICE_ROLE_KEY"
)

echo "=== Checking Required Core Variables ==="
MISSING_COUNT=0
for var in "${REQUIRED_VARS[@]}"; do
    VALUE=$(vercel env ls "$var" --scope production 2>/dev/null | grep -v "No environment variables" || echo "")
    if [ -z "$VALUE" ]; then
        echo -e "${RED}✗ MISSING: $var${NC}"
        ((MISSING_COUNT++))
    else
        echo -e "${GREEN}✓ SET: $var${NC}"
    fi
done

echo ""
echo "=== Checking Stripe Variables (Required for Billing) ==="
for var in "${STRIPE_VARS[@]}"; do
    VALUE=$(vercel env ls "$var" --scope production 2>/dev/null | grep -v "No environment variables" || echo "")
    if [ -z "$VALUE" ]; then
        echo -e "${RED}✗ MISSING: $var${NC}"
        ((MISSING_COUNT++))
    else
        echo -e "${GREEN}✓ SET: $var${NC}"
    fi
done

echo ""
echo "=== Checking Email Variables (Required for Invites) ==="
for var in "${EMAIL_VARS[@]}"; do
    VALUE=$(vercel env ls "$var" --scope production 2>/dev/null | grep -v "No environment variables" || echo "")
    if [ -z "$VALUE" ]; then
        echo -e "${YELLOW}⚠ MISSING: $var${NC}"
        ((MISSING_COUNT++))
    else
        echo -e "${GREEN}✓ SET: $var${NC}"
    fi
done

echo ""
echo "=== Checking Sentry Variables (Required for Error Tracking) ==="
for var in "${SENTRY_VARS[@]}"; do
    VALUE=$(vercel env ls "$var" --scope production 2>/dev/null | grep -v "No environment variables" || echo "")
    if [ -z "$VALUE" ]; then
        echo -e "${YELLOW}⚠ MISSING: $var${NC}"
        ((MISSING_COUNT++))
    else
        echo -e "${GREEN}✓ SET: $var${NC}"
    fi
done

echo ""
echo "=== Checking Security Variables ==="
for var in "${SECURITY_VARS[@]}"; do
    VALUE=$(vercel env ls "$var" --scope production 2>/dev/null | grep -v "No environment variables" || echo "")
    if [ -z "$VALUE" ]; then
        echo -e "${RED}✗ MISSING: $var${NC}"
        ((MISSING_COUNT++))
    else
        echo -e "${GREEN}✓ SET: $var${NC}"
    fi
done

echo ""
echo "=== Checking Forbidden Variables (Should NOT be set) ==="
FORBIDDEN_COUNT=0
for var in "${FORBIDDEN_VARS[@]}"; do
    VALUE=$(vercel env ls "$var" --scope production 2>/dev/null | grep -v "No environment variables" || echo "")
    if [ -n "$VALUE" ]; then
        echo -e "${RED}✗ ILLEGAL: $var (REMOVE THIS IMMEDIATELY)${NC}"
        ((FORBIDDEN_COUNT++))
    else
        echo -e "${GREEN}✓ Correctly not set: $var${NC}"
    fi
done

echo ""
echo "=== Summary ==="
if [ $MISSING_COUNT -eq 0 ] && [ $FORBIDDEN_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All environment variables are correctly configured${NC}"
    exit 0
else
    echo -e "${RED}✗ $MISSING_COUNT required variables missing${NC}"
    if [ $FORBIDDEN_COUNT -gt 0 ]; then
        echo -e "${RED}✗ $FORBIDDEN_COUNT forbidden variables present (REMOVE THESE)${NC}"
    fi
    exit 1
fi
