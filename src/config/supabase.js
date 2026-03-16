const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = require('./env');

// Client publik — mengikuti Row Level Security (RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Client admin — bypass RLS, hanya dipakai di server-side admin routes
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabase, supabaseAdmin };
