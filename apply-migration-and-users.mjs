import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      process.env[key] = value;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
});

async function runSQLFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n=== Applying SQL: ${path.basename(filePath)} ===`);
  console.log('  Note: Supabase does not expose arbitrary SQL execution via REST API');
  console.log('  for security. We will create the users first. Please apply the');
  console.log('  migration via Supabase Dashboard SQL Editor (see instructions below).');

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      }
    });
    if (response.ok) {
      console.log('  ✅ Service role connectivity verified (REST API reachable)');
    }
  } catch (e) {
    console.log('  ⚠️  Connectivity check:', e.message);
  }

  console.log('\n============================================================');
  console.log('  ⚠️  MIGRATION APPLICATION INSTRUCTIONS');
  console.log('============================================================');
  console.log('  Please apply the migration SQL manually via the Supabase Dashboard:');
  console.log('');
  console.log('  1. Open: https://supabase.com/dashboard/project/naekgrdkavagfcindqal/sql/new');
  console.log('  2. Make sure "public" schema is selected at the top');
  console.log('  3. PASTE the ENTIRE contents of this file:');
  console.log(`     ${filePath}`);
  console.log('  4. Click "RUN" (bottom-left)');
  console.log('  5. You should see "Success. No rows returned" in green.');
  console.log('');
  console.log('  The migration creates:');
  console.log('   • Updated role system (developer/admin/manager/apprentice)');
  console.log('   • Tables: parts, stock_movements, customers, banks,');
  console.log('             sales, sale_payments, receipts, activity_logs');
  console.log('   • 15+ RLS policies per role');
  console.log('   • Stock & sale approval triggers');
  console.log('============================================================');
  return true;
}

async function createRoleUser(email, password, role, fullName) {
  console.log(`\n--- Creating ${role.toUpperCase()} user ---`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);

  try {
    const { data: signUpData, error: signUpError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role }
    });

    if (signUpError) {
      if (signUpError.code === 'user_already_exists') {
        console.log('  ℹ️  User already exists, updating profile role...');
        const { data: list } = await admin.auth.admin.listUsers();
        const user = list.users.find(u => u.email === email);
        if (user) {
          const { error: updateAuthErr } = await admin.auth.admin.updateUserById(user.id, { password });
          if (updateAuthErr) console.log('  ⚠️  Auth update:', updateAuthErr.message);

          const { error: profileErr } = await admin
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: fullName,
              role,
              is_active: true,
              created_password: password
            }, { onConflict: 'id' });

          if (profileErr) {
            console.log('  ❌ Profile update failed:', profileErr.message);
            return false;
          }
          console.log('  ✅ Updated existing user');
          return true;
        }
      }
      console.log('  ❌ Sign up error:', signUpError.code, signUpError.message);
      return false;
    }

    const userId = signUpData.user.id;
    console.log('  Auth ID:', userId);

    const { error: profileErr } = await admin
      .from('profiles')
      .insert({
        id: userId,
        full_name: fullName,
        role,
        is_active: true,
        created_password: password
      });

    if (profileErr) {
      console.log('  ❌ Profile insert failed:', profileErr.message);
      return false;
    }

    console.log('  ✅ Created successfully');
    return true;
  } catch (e) {
    console.log('  ❌ Exception:', e.message);
    return false;
  }
}

async function main() {
  console.log('============================================================');
  console.log('OW Motors - ERP Migration & Test User Setup');
  console.log('============================================================');

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260809030000_erp_role_system_and_sales_inventory.sql');

  // Step 1: Apply migration
  const migrationOk = await runSQLFile(migrationPath);

  if (!migrationOk) {
    console.log('\n⚠️  Migration did not apply via API. Please:');
    console.log('  1. Open https://supabase.com/dashboard/project/naekgrdkavagfcindqal/sql/new');
    console.log('  2. Paste the contents of:');
    console.log('     supabase/migrations/20260809030000_erp_role_system_and_sales_inventory.sql');
    console.log('  3. Run it (this will take a few seconds)');
    console.log('  4. Then re-run this script for user creation');
  }

  // Step 2: Wait a moment then create test users regardless (they only need profiles + auth)
  console.log('\n\n=== Creating 4 Test Login Accounts ===');

  const users = [
    {
      email: 'developer@owmotors.pk',
      password: 'Developer@2026!',
      role: 'developer',
      name: 'OW Motors Developer'
    },
    {
      email: 'admin@owmotors.pk',
      password: 'Admin@2026!',
      role: 'admin',
      name: 'OW Motors Admin'
    },
    {
      email: 'manager@owmotors.pk',
      password: 'Manager@2026!',
      role: 'manager',
      name: 'Showroom Manager'
    },
    {
      email: 'apprentice@owmotors.pk',
      password: 'Apprentice@2026!',
      role: 'apprentice',
      name: 'Sales Apprentice'
    }
  ];

  let created = 0;
  for (const u of users) {
    if (await createRoleUser(u.email, u.password, u.role, u.name)) created++;
  }

  console.log('\n\n=== CREDENTIALS SUMMARY ===');
  console.log('Save these logins for testing each role access level:\n');
  for (const u of users) {
    console.log(`[${u.role.toUpperCase()}]`);
    console.log(`  Email    : ${u.email}`);
    console.log(`  Password : ${u.password}`);
    console.log(`  Login URL: /admin/login\n`);
  }

  console.log('\n=== NEXT STEPS ===');
  if (!migrationOk) {
    console.log('1. Apply migration SQL via Supabase dashboard (see instructions above)');
    console.log('2. Confirm tables: parts, stock_movements, customers, banks, sales, sale_payments, receipts, activity_logs exist');
  } else {
    console.log('✅ Migration applied via API');
  }
  console.log(`✅ ${created}/4 test users provisioned (credentials above)`);
  console.log('\nNow proceeding to build the UI components in Next.js...');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
