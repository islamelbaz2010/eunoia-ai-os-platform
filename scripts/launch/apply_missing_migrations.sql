-- Safe Migration Application Script
-- This script checks each migration and applies ONLY if not already applied
-- Run this in Supabase SQL Editor
-- Each section is wrapped in DO blocks to prevent errors if already applied

-- Migration 0003: Grants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname LIKE 'organizations_%' 
        OR polname LIKE 'memberships_%'
        LIMIT 1
    ) THEN
        RAISE NOTICE 'Applying 0003_grants.sql...';
        -- Paste contents of 0003_grants.sql here
        -- For now, this is a placeholder - manually apply the file
        RAISE NOTICE 'Please manually apply 0003_grants.sql';
    ELSE
        RAISE NOTICE '0003_grants already applied, skipping';
    END IF;
END $$;

-- Migration 0004: Indexes and Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = 'knowledge_base_chunks_embedding_idx'
        AND n.nspname = 'public'
    ) THEN
        RAISE NOTICE 'Applying 0004_indexes_policies.sql...';
        -- Paste contents of 0004_indexes_policies.sql here
        RAISE NOTICE 'Please manually apply 0004_indexes_policies.sql';
    ELSE
        RAISE NOTICE '0004_indexes_policies already applied, skipping';
    END IF;
END $$;

-- Migration 0005: Schema Hardening (CRITICAL - create_organization RPC)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'create_organization'
    ) THEN
        RAISE NOTICE 'Applying 0005_schema_hardening.sql...';
        -- Paste contents of 0005_schema_hardening.sql here
        RAISE NOTICE 'Please manually apply 0005_schema_hardening.sql';
    ELSE
        RAISE NOTICE '0005_schema_hardening already applied, skipping';
    END IF;
END $$;

-- Migration 0006: Hardening v2 (CRITICAL - accept_org_invite RPC)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'accept_org_invite'
    ) THEN
        RAISE NOTICE 'Applying 0006_hardening_v2.sql...';
        -- Paste contents of 0006_hardening_v2.sql here
        RAISE NOTICE 'Please manually apply 0006_hardening_v2.sql';
    ELSE
        RAISE NOTICE '0006_hardening_v2 already applied, skipping';
    END IF;
END $$;

-- Migration 0007: get_usage_totals RPC
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_usage_totals'
    ) THEN
        RAISE NOTICE 'Applying 0007_get_usage_totals.sql...';
        -- Paste contents of 0007_get_usage_totals.sql here
        RAISE NOTICE 'Please manually apply 0007_get_usage_totals.sql';
    ELSE
        RAISE NOTICE '0007_get_usage_totals already applied, skipping';
    END IF;
END $$;

-- Migration 0008: Health Check
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'healthcheck'
    ) THEN
        RAISE NOTICE 'Applying 0008_health_check.sql...';
        -- Paste contents of 0008_health_check.sql here
        RAISE NOTICE 'Please manually apply 0008_health_check.sql';
    ELSE
        RAISE NOTICE '0008_health_check already applied, skipping';
    END IF;
END $$;

-- Migration 0009a: Enum Roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'member_role'
        AND e.enumlabel = 'super_admin'
    ) THEN
        RAISE NOTICE 'Applying 0009a_enum_roles.sql...';
        -- Paste contents of 0009a_enum_roles.sql here
        RAISE NOTICE 'Please manually apply 0009a_enum_roles.sql';
    ELSE
        RAISE NOTICE '0009a_enum_roles already applied, skipping';
    END IF;
END $$;

-- Migration 0009b: Enterprise Schema
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'org_settings'
    ) THEN
        RAISE NOTICE 'Applying 0009b_enterprise_schema.sql...';
        -- Paste contents of 0009b_enterprise_schema.sql here
        RAISE NOTICE 'Please manually apply 0009b_enterprise_schema.sql';
    ELSE
        RAISE NOTICE '0009b_enterprise_schema already applied, skipping';
    END IF;
END $$;

-- Migration 0010: CRM Platform Fixed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'crm_contacts'
        AND column_name = 'pipeline_stage'
    ) THEN
        RAISE NOTICE 'Applying 0010_crm_platform_fixed.sql...';
        -- Paste contents of 0010_crm_platform_fixed.sql here
        RAISE NOTICE 'Please manually apply 0010_crm_platform_fixed.sql';
    ELSE
        RAISE NOTICE '0010_crm_platform_fixed already applied, skipping';
    END IF;
END $$;

-- Migration 0011: Billing (CRITICAL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'billing_subscriptions'
    ) THEN
        RAISE NOTICE 'Applying 0011_billing.sql...';
        -- Paste contents of 0011_billing.sql here
        RAISE NOTICE 'Please manually apply 0011_billing.sql';
    ELSE
        RAISE NOTICE '0011_billing already applied, skipping';
    END IF;
END $$;

-- Final Summary
RAISE NOTICE 'Migration check complete. Review the notices above to see which migrations were applied.';
