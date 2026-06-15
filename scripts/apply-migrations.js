#!/usr/bin/env node

/**
 * Apply AI Learning Database Migrations
 * Shows the SQL needed to apply via Supabase Dashboard
 */

const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260422_add_ai_learning_tables.sql');

if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Migration file not found: ${migrationFile}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationFile, 'utf-8');

console.log('\n🎯 AI LEARNING SYSTEM - DATABASE MIGRATION GUIDE\n');
console.log('━'.repeat(70));
console.log('');
console.log('📚 MIGRATION SQL TO APPLY:');
console.log('');
console.log(sql);
console.log('');
console.log('━'.repeat(70));
console.log('');
console.log('✅ HOW TO APPLY THIS MIGRATION:\n');
console.log('1. Open your Supabase Project Dashboard:');
console.log('   👉 https://tmndsxuefhvniwmviwcg.supabase.co/project/\n');
console.log('2. In the left sidebar, click "SQL Editor"\n');
console.log('3. Click the "+ New Query" button\n');
console.log('4. Clear the default template and paste the SQL above\n');
console.log('5. Click the "Run" button (⏯️ icon)\n');
console.log('6. Check the results - should show success with no errors\n');
console.log('');
console.log('✅ AFTER MIGRATION - VERIFY SUCCESS:\n');
console.log('Run this verification query in SQL Editor:');
console.log('');
console.log('  SELECT table_name FROM information_schema.tables ');
console.log('  WHERE table_schema = \'public\'');
console.log('  AND table_name IN (\'ai_weights\', \'ai_trade_history\', \'historical_performance\');');
console.log('');
console.log('Should return 3 tables:');
console.log('  ✓ ai_weights');
console.log('  ✓ ai_trade_history');
console.log('  ✓ historical_performance');
console.log('');
console.log('━'.repeat(70));
console.log('');
console.log('💡 OPTIONAL - Bootstrap with Default Weights:\n');
console.log('After tables are created, run this to add default AI weights:');
console.log('');
console.log('  INSERT INTO public.ai_weights (');
console.log('    version, trend_weight, volume_weight, rsi_weight,');
console.log('    entry_quality_weight, historical_performance_weight, metadata');
console.log('  ) VALUES (');
console.log('    1, 0.25, 0.20, 0.20, 0.20, 0.15,');
console.log('    \'{"source": "default", "description": "Initial weights"}\'');
console.log('  );');
console.log('');
console.log('━'.repeat(70));
console.log('');
console.log('✨ Migration file saved at:');
console.log(`   ${migrationFile}`);
console.log('');
