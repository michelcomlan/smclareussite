const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env'
  );
}

// IMPORTANT : on utilise la clé service_role ici, jamais la clé anon.
// Cette clé contourne les policies RLS — elle ne doit JAMAIS être exposée
// au front-end. Toute la logique métier sensible (paiement, admin) passe
// obligatoirement par ce back-end.
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
