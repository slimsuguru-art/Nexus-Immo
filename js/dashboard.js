import {
  supabase
} from './supabase.js';
(async () => {
  const {
    data: {
      user
    }
  } = await supabase.auth.getUser();
  if (!user) {
    location.href = 'login.html';
    return
  }
  document.querySelector('#welcome').textContent = `Bonjour ${user.user_metadata?.full_name||''}`;
  const {
    data,
    error
  } = await supabase.from('properties').select('*').eq('owner_id', user.id).order('created_at', {
    ascending: false
  });
  const list = data || [];
  document.querySelector('#stats').innerHTML =
    `<div class="stat"><span>Annonces</span><strong>${list.length}</strong></div><div class="stat"><span>Disponibles</span><strong>${list.filter(p=>p.status==='available').length}</strong></div><div class="stat"><span>Profil</span><strong>${user.user_metadata?.role||'—'}</strong></div>`;
  const g = document.querySelector('#dashboardContent');
  if (error) {
    g.innerHTML = '<div class="empty-state">Erreur de chargement.</div>';
    return
  }
  g.innerHTML = list.length ? list.map(p =>
    `<article class="property-card"><img class="property-image" src="${p.image_url||'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80'}"><div class="property-body"><h3>${p.title}</h3><div class="property-meta">${p.city||''} · ${p.status}</div><div class="property-price">${Number(p.price||0).toLocaleString('fr-FR')} FCFA</div></div></article>`
    ).join('') : '<div class="empty-state">Aucune annonce.</div>'
})();
document.querySelector('#logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.href = 'index.html'
});
