/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnrossvphnsqwhzyjscb.supabase.co';
const supabaseKey = 'sb_publishable_OVsAh_Mqtj8SUgoRTHm8Og_PNd10cYo';

export const supabase = createClient(supabaseUrl, supabaseKey);
