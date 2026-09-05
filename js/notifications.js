import { supabase } from './supabase.js';

async function updateBadge(user) {
  const target = document.querySelector('a[href="messagerie.html"]') || document.querySelector('#navAuthLink');
  if (!target) return;

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null);

  let badge = target.querySelector('.nav-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      target.appendChild(badge);
    }
    badge.textContent = count > 9 ? '9+' : String(count);
  } else if (badge) {
    badge.remove();
  }
}

(async () => {
  const { data: { user } } = await supabase.auth.getUser();

  const authLink = document.querySelector('#navAuthLink');
  if (authLink && user) {
    authLink.textContent = 'Mon espace';
    authLink.href = 'dashboard.html';
  }

  if (!user) return;

  updateBadge(user);

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  supabase
    .channel('global-notifications')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}`
    }, payload => {
      updateBadge(user);
      // N'affiche une vraie notification navigateur que si l'onglet n'est pas
      // au premier plan — sinon la messagerie elle-même gère déjà l'affichage.
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification('Nouveau message KAZA', {
          body: (payload.new.content || '').slice(0, 120),
          icon: 'icons/icon-192.png'
        });
      }
    })
    .subscribe();
})();
