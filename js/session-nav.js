import { supabase } from './supabase.js';

const link = document.querySelector('#navAuthLink');
if (link) {
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      link.textContent = 'Mon espace';
      link.href = 'dashboard.html';
    }
  });
}
