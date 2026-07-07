#!/bin/bash

# Production Smoke Test Script
# This script runs automated smoke tests against the production deployment
# Usage: ./smoke_test.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROD_URL="https://eunoia-ai-os-platform.vercel.app"

echo "=== Production Smoke Test ==="
echo "Testing URL: $PROD_URL"
echo ""

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $test_name... "
    
    RESULT=$(eval "$test_command" 2>&1)
    
    if echo "$RESULT" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected pattern: $expected_pattern"
        echo "  Got: $RESULT"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "=== Phase 1: Health Endpoints ==="
echo ""

run_test \
    "Liveness probe" \
    "curl -s $PROD_URL/api/live" \
    '"status":"ok"'

run_test \
    "Readiness probe" \
    "curl -s $PROD_URL/api/health" \
    '"status":"ready"'

echo ""
echo "=== Phase 2: Public Pages ==="
echo ""

run_test \
    "Landing page loads" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/" \
    "200"

run_test \
    "Signup page loads" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/signup" \
    "200"

run_test \
    "Login page loads" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/login" \
    "200"

echo ""
echo "=== Phase 3: Protected Pages (Redirect Check) ==="
echo ""

run_test \
    "Dashboard redirects unauthenticated" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/dashboard" \
    "307\|302"

run_test \
    "Onboarding redirects unauthenticated" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/onboarding" \
    "307\|302"

run_test \
    "Billing redirects unauthenticated" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/dashboard/billing" \
    "307\|302"

echo ""
echo "=== Phase 4: API Endpoints ==="
echo ""

run_test \
    "Metrics endpoint requires auth" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/api/metrics" \
    "401\|403"

run_test \
    "Admin system endpoint requires auth" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/api/admin/system" \
    "401\|403"

run_test \
    "Webhook endpoint rejects GET" \
    "curl -s -o /dev/null -w '%{http_code}' $PROD_URL/api/stripe/webhook" \
    "405"

echo ""
echo "=== Phase 5: Security Headers ==="
echo ""

run_test \
    "HSTS header present" \
    "curl -s -I $PROD_URL/ | grep -i 'strict-transport-security'" \
    "Strict-Transport-Security"

run_test \
    "X-Frame-Options header present" \
    "curl -s -I $PROD_URL/ | grep -i 'x-frame-options'" \
    "DENY"

echo ""
echo "=== Phase 6: Database Migration Checks ==="
echo ""

# These checks require Supabase credentials
# For now, we'll skip and provide instructions
echo -e "${YELLOW}⚠ Skipping database migration checks${NC}"
echo "  Run verify_migrations.sql in Supabase SQL Editor to verify migrations"
echo ""

echo "=== Phase 7: Environment Variable Checks ==="
echo ""

if command -v vercel &> /dev/null; then
    run_test \
        "NEXT_PUBLIC_SUPABASE_URL set" \
        "vercel env ls NEXT_PUBLIC_SUPABASE_URL --scope production 2>/dev/null | grep -v 'No environment'" \
        "NEXT_PUBLIC_SUPABASE_URL"
    
    run_test \
        "NEXT_PUBLIC_SUPABASE_ANON_KEY set" \
        "vercel env ls NEXT_PUBLIC_SUPABASE_ANON_KEY --scope production 2>/dev/null | grep -v 'No environment'" \
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    
    run_test \
        "OPENAI_API_KEY set" \
        "vercel env ls OPENAI_API_KEY --scope production 2>/dev/null | grep -v 'No environment'" \
        "OPENAI_API_KEY"
else
    echo -e "${YELLOW}⚠ Skipping environment variable checks (vercel CLI not installed)${NC}"
    echo "  Run ./verify_vercel_env.sh to check environment variables"
fi

echo ""
echo "=== Phase 8: Stripe Configuration Checks ==="
echo ""

if command -v vercel &> /dev/null; then
    run_test \
        "STRIPE_SECRET_KEY set" \
        "vercel env ls STRIPE_SECRET_KEY --scope production 2>/dev/null | grep -v 'No environment'" \
        "STRIPE_SECRET_KEY"
    
    run_test \
        "STRIPE_WEBHOOK_SECRET set" \
        "vercel env ls STRIPE_WEBHOOK_SECRET --scope production 2>/dev/null | grep -v 'No environment'" \
        "STRIPE_WEBHOOK_SECRET"
else
    echo -e "${YELLOW}⚠ Skipping Stripe checks (vercel CLI not installed)${NC}"
    echo "  Run ./verify_vercel_env.sh to check Stripe configuration"
fi

echo ""
echo "=== Phase 9: Email Configuration Checks ==="
echo ""

if command -v vercel &> /dev/null; then
    run_test \
        "RESEND_API_KEY set" \
        "vercel env ls RESEND_API_KEY --scope production 2>/dev/null | grep -v 'No environment'" \
        "RESEND_API_KEY"
    
    run_test \
        "FROM_EMAIL set" \
        "vercel env ls FROM_EMAIL --scope production 2>/dev/null | grep -v 'No environment'" \
        "FROM_EMAIL"
else
    echo -e "${YELLOW}⚠ Skipping email checks (vercel CLI not installed)${NC}"
fi

echo ""
echo "=== Test Summary ==="
echo "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All automated smoke tests passed${NC}"
    echo ""
    echo "Manual tests still required:"
    echo "1. Sign up flow (create account → onboarding → dashboard)"
    echo "2. Upload a Knowledge Base document"
    echo "3. Test AI assistant with streaming response"
    echo "4. Test Stripe checkout (if configured)"
    echo "5. Test team invite flow (if email configured)"
    echo "6. Verify database migrations via Supabase SQL Editor"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some smoke tests failed${NC}"
    echo "Review the failures above and fix before proceeding"
    exit 1
fi
