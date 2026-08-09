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

const userMap = [
  { email: 'developer@owmotors.pk', password: 'Developer@2026!', role: 'developer', name: 'OW Motors Developer', id: null },
  { email: 'admin@owmotors.pk', password: 'Admin@2026!', role: 'admin', name: 'OW Motors Admin', id: null },
  { email: 'manager@owmotors.pk', password: 'Manager@2026!', role: 'manager', name: 'Showroom Manager', id: null },
  { email: 'apprentice@owmotors.pk', password: 'Apprentice@2026!', role: 'apprentice', name: 'Sales Apprentice', id: null }
];

async function main() {
  console.log('Looking up auth user IDs...');
  const { data: users } = await admin.auth.admin.listUsers();
  for (const u of userMap) {
    const found = users.users.find(x => x.email === u.email);
    if (found) {
      u.id = found.id;
      console.log(`  ${u.email} => ${found.id}`);
    } else {
      console.log(`  ⚠️ ${u.email} not found in auth`);
    }
  }

  console.log('\nInserting profiles (core columns only)...');
  for (const u of userMap) {
    if (!u.id) continue;
    const row = {
      id: u.id, full_name: u.name, role: u.role, is_active: true
    };
    const { error } = await admin.from('profiles').upsert(row, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      if (error.message.includes('profiles_role_valid')) {
        console.log(`  ❌ ${u.email}: role constraint - migration not applied yet. Run migration SQL first.`);
      } else {
        console.log(`  ⚠️  ${u.email}:`, error.code, error.message.substring(0, 120));
      }
    } else {
      console.log(`  ✅ ${u.email} (${u.role})`);
    }
  }

  console.log('\n✅ Done. REMINDER: Apply the SQL migration file first before this will fully work:');
  console.log('supabase/migrations/20260809030000_erp_role_system_and_sales_inventory.sql');
}
main().catch(console.error);
