// /timurita/supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://qnczakppadjxbicgjzcy.supabase.co '; // 👈 pakeisk
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuY3pha3BwYWRqeGJpY2dqemN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTYxMjcsImV4cCI6MjA3ODUzMjEyN30.0lAl6L1GU1_uWpULlraaKM0KIfy3lCNSI_wp2X5zDmY  ';            // 👈 pakeisk

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,     // saugo sesiją localStorage
    autoRefreshToken: true,
    detectSessionInUrl: true  // reikalinga, jei naudoji magic link
  }
});
