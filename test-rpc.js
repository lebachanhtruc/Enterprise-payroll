require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const { data, error } = await supabase.rpc('fn_seed_sandbox', { p_company_id: '123', p_employees: [] });
    console.log('Data:', data);
    console.log('Error:', error);
}
test();
