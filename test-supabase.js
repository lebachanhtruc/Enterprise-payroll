import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabaseAdmin.auth.getUser("dummy_token");
  console.log("Error:", error);
}

test();
