const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and key must be set in environment variables. Use SUPABASE_SERVICE_ROLE_KEY for server-side access.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
    },
});

module.exports = supabase;
