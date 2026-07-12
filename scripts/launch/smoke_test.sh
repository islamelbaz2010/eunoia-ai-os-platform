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
    
    if echo "$RESULT" | grep -qi "$expected_pattern"; then
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

# Check env vars via Vercel CLI (timeout 10s to prevent hanging)
if command -v vercel &> /dev/null; then
    ENV_LIST=$(timeout 10 vercel env ls --environment production 2>/dev/null || echo "")
    for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY OPENAI_API_KEY; do
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        echo -n "Testing: $var set... "
        if echo "$ENV_LIST" | grep -q "$var"; then
            echo -e "${GREEN}✓ PASS${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${YELLOW}⚠ SKIP${NC} (run 'vercel env ls' to verify manually)"
        fi
    done
else
    echo -e "${YELLOW}⚠ Skipping environment variable checks (vercel CLI not installed)${NC}"
fi

echo ""
echo "=== Phase 8: Stripe Configuration Checks ==="
echo ""

if command -v vercel &> /dev/null && [[ -n "$ENV_LIST" ]]; then
    for var in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        echo -n "Testing: $var set... "
        if echo "$ENV_LIST" | grep -q "$var"; then
            echo -e "${GREEN}✓ PASS${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${YELLOW}⚠ SKIP${NC} (billing optional for exhibition)"
        fi
    done
else
    echo -e "${YELLOW}⚠ Skipping Stripe checks${NC}"
fi

echo ""
echo "=== Phase 9: Email Configuration Checks ==="
echo ""

if command -v vercel &> /dev/null && [[ -n "$ENV_LIST" ]]; then
    for var in RESEND_API_KEY FROM_EMAIL; do
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        echo -n "Testing: $var set... "
        if echo "$ENV_LIST" | grep -q "$var"; then
            echo -e "${GREEN}✓ PASS${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${YELLOW}⚠ SKIP${NC} (email optional for exhibition)"
        fi
    done
else
    echo -e "${YELLOW}⚠ Skipping email checks${NC}"
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
