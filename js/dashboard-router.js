import { supabase } from './supabase.js';

(async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    location.replace('login.html');
    return;
  }

  const role = user.user_metadata?.role;
  location.replace(role === 'bailleur' ? 'dashboard-bailleur.html' : 'dashboard-locataire.html');
})();
