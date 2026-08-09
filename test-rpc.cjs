require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', '00000000-0000-0000-0000-000000000000').single();
    console.log('Error from select 0 rows with .single():', error);
}
test();
