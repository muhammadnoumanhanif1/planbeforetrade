#!/usr/bin/env node

/**
 * Database Migration Script
 * Applies Phase 1 Pakistan Payments schema fixes
 * 
 * Usage: node scripts/migrate-pakistan-payments.js
 * 
 * This script outputs the SQL migration commands that need to be applied
 * to your Supabase database.
 */

function runMigration() {
  console.log('🔄 Pakistan Payments Schema Migration\n')
  console.log('Phase: 1-Fix-Pakistan-Payments')
  console.log('Date: April 4, 2026\n')

  const steps = [
    {
      name: 'Rename phone_number to sender_number',
      sql: `ALTER TABLE public.pakistan_payments 
RENAME COLUMN phone_number TO sender_number;`,
    },
    {
      name: 'Add missing columns',
      sql: `ALTER TABLE public.pakistan_payments
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;`,
    },
    {
      name: 'Add plan value constraint',
      sql: `ALTER TABLE public.pakistan_payments
ADD CONSTRAINT check_pakistan_payments_plan 
  CHECK (plan IN ('weekly', 'monthly', 'yearly'));`,
    },
    {
      name: 'Create indexes for performance',
      sql: `CREATE INDEX IF NOT EXISTS idx_pakistan_payments_user_email 
  ON public.pakistan_payments (user_email);
  
CREATE INDEX IF NOT EXISTS idx_pakistan_payments_plan 
  ON public.pakistan_payments (plan);`,
    },
  ]

  console.log('📋 SQL Migration Commands:')
  console.log('=' .repeat(70))
  
  steps.forEach((step, index) => {
    console.log(`\n-- Step ${index + 1}: ${step.name}`)
    console.log(step.sql)
  })
  
  console.log('\n' + '=' .repeat(70))
  
  console.log('\n✅ Migration ready!\n')
  console.log('📝 How to apply:')
  console.log('   1. Go to: https://supabase.com/dashboard/project/_/sql')
  console.log('   2. Create new query')
  console.log('   3. Paste all SQL commands above')
  console.log('   4. Click "Run" button\n')
  
  console.log('🔍 Verify with:')
  console.log('   SELECT column_name FROM information_schema.columns')
  console.log('   WHERE table_name = \'pakistan_payments\';')
  console.log('\nExpected columns: id, user_id, provider, transaction_id, amount,')
  console.log('sender_number, user_email, plan, status, verification_notes,')
  console.log('rejection_reason, verified_by, verified_at, notes, created_at')
}

// Run migration
runMigration()
