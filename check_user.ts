import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const url = Deno.env.get('VITE_SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

const supabase = createClient(url, key);

try {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error);
    Deno.exit(1);
  }

  const testUser = data.users.find(u => u.email === 'magnus@froste.eu');

  if (testUser) {
    console.log('✅ Test user found:', testUser.email);
    console.log('ID:', testUser.id);
    console.log('Created:', testUser.created_at);
    console.log('Email confirmed:', testUser.email_confirmed_at ? 'Yes' : 'No');
  } else {
    console.log('❌ Test user NOT found');
    console.log('Available users:');
    if (data.users.length === 0) {
      console.log('  (No users found)');
    } else {
      data.users.forEach(u => console.log('  -', u.email));
    }
  }
} catch (error) {
  console.error('Error:', error);
  Deno.exit(1);
}
