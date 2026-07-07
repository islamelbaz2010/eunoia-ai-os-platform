-- Migration Verification Script
-- Run this in Supabase SQL Editor to check which migrations are applied
-- This script is idempotent and safe to run multiple times

-- Format: Each migration check returns a boolean result
-- true = migration applied, false = migration not applied

-- Migration 0003: Grants
-- Checks if RLS grants are applied on core tables
SELECT 
    '0003_grants' as migration_name,
    EXISTS(
        SELECT 1 FROM pg_policy 
        WHERE polname LIKE 'organizations_%' 
        OR polname LIKE 'memberships_%'
        OR polname LIKE 'crm_contacts_%'
        OR polname LIKE 'knowledge_base_%'
        OR polname LIKE 'audit_events_%'
        OR polname LIKE 'usage_events_%'
        OR polname LIKE 'org_invites_%'
    ) as is_applied;

-- Migration 0004: Indexes and Policies
-- Checks for HNSW vector index and additional RLS policies
SELECT 
    '0004_indexes_policies' as migration_name,
    EXISTS(
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = 'knowledge_base_chunks_embedding_idx'
        AND n.nspname = 'public'
    ) as is_applied;

-- Migration 0005: Schema Hardening (create_organization RPC)
-- CRITICAL: Without this, onboarding crashes
SELECT 
    '0005_schema_hardening' as migration_name,
    EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'create_organization'
    ) as is_applied;

-- Migration 0006: Hardening v2 (accept_org_invite RPC)
-- CRITICAL: Without this, invite accept is broken
SELECT 
    '0006_hardening_v2' as migration_name,
    EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'accept_org_invite'
    ) as is_applied;

-- Migration 0007: get_usage_totals RPC
-- CRITICAL: Without this, usage page shows empty
SELECT 
    '0007_get_usage_totals' as migration_name,
    EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'get_usage_totals'
    ) as is_applied;

-- Migration 0008: Health Check
-- Checks for healthcheck() function
SELECT 
    '0008_health_check' as migration_name,
    EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'healthcheck'
    ) as is_applied;

-- Migration 0009a: Enum Roles
-- Checks for extended member_role enum values
SELECT 
    '0009a_enum_roles' as migration_name,
    EXISTS(
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'member_role'
        AND e.enumlabel IN ('super_admin', 'manager', 'operator', 'editor', 'guest')
    ) as is_applied;

-- Migration 0009b: Enterprise Schema
-- Checks for org_settings, api_keys, team_quotas, webhooks tables
SELECT 
    '0009b_enterprise_schema' as migration_name,
    EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN ('org_settings', 'api_keys', 'team_quotas', 'webhooks')
    ) as is_applied;

-- Migration 0010: CRM Platform Fixed
-- Checks for CRM advanced features (pipeline_stage, owner_id, activities, etc.)
SELECT 
    '0010_crm_platform_fixed' as migration_name,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'crm_contacts'
        AND column_name IN ('pipeline_stage', 'owner_id', 'archived_at', 'deleted_at', 'tags')
    ) AND EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'check_crm_duplicate'
    ) AND EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'get_crm_metrics'
    ) as is_applied;

-- Migration 0011: Billing
-- CRITICAL: Without this, Stripe billing is completely broken
SELECT 
    '0011_billing' as migration_name,
    EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'billing_subscriptions'
    ) AND EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'billing_events'
    ) AND EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'process_stripe_event'
    ) as is_applied;

-- Summary Report
SELECT 
    migration_name,
    CASE 
        WHEN is_applied THEN '✅ APPLIED'
        ELSE '❌ MISSING'
    END as status
FROM (
    -- Union of all the above checks would go here
    -- For manual execution, run each SELECT above individually
    SELECT '0003_grants' as migration_name, true as is_applied
) as dummy
LIMIT 0; -- Remove this LIMIT and use UNION ALL above for automated summary
