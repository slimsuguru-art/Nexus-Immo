import { supabase } from './supabase.js';

const fallbackImg = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80';

(async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    location.replace('login.html');
    return;
  }
  if (user.user_metadata?.role === 'locataire') {
    location.replace('dashboard-locataire.html');
    return;
  }

  document.querySelector('#welcome').textContent = `Bonjour ${user.user_metadata?.full_name || ''}`;

  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const list = properties || [];

  const { data: contrats } = await supabase
    .from('contrats')
    .select('*, properties(title), profiles!contrats_locataire_id_fkey(full_name)')
    .eq('bailleur_id', user.id)
    .order('date_debut', { ascending: false });

  const contratList = contrats || [];

  document.querySelector('#stats').innerHTML = `
    <div class="stat"><span>Annonces</span><strong>${list.length}</strong></div>
    <div class="stat"><span>Disponibles</span><strong>${list.filter(p => p.status === 'available').length}</strong></div>
    <div class="stat"><span>Contrats actifs</span><strong>${contratList.filter(c => c.statut === 'actif').length}</strong></div>
  `;

  const grid = document.querySelector('#dashboardContent');
  if (propError) {
    grid.innerHTML = '<div class="empty-state">Erreur de chargement des annonces.</div>';
  } else {
    grid.innerHTML = list.length
      ? list.map(p => `
        <article class="property-card">
          <img class="property-image" src="${p.image_url || fallbackImg}" alt="">
          <div class="property-body">
            <h3>${p.title}</h3>
            <div class="property-meta">${p.city || ''} · ${p.status}</div>
            <div class="property-price">${Number(p.price || 0).toLocaleString('fr-FR')} FCFA</div>
          </div>
        </article>
      `).join('')
      : '<div class="empty-state">Aucune annonce pour l\'instant. <a class="text-link" href="publish.html">Publier votre premier logement →</a></div>';
  }

  const contratsBox = document.querySelector('#contratsList');
  contratsBox.innerHTML = contratList.length
    ? contratList.map(c => {
      const moisRestants = Math.max(0, Math.round((new Date(c.date_fin) - new Date()) / 86400000 / 30));
      return `
        <div class="contrat-row">
          <div>
            <strong>${c.properties?.title || 'Logement'}</strong>
            <span class="contrat-sub">${c.profiles?.full_name || 'Locataire'}</span>
          </div>
          <span class="contrat-status contrat-status--${c.statut}">${c.statut.replace('_', ' ')}</span>
          <span class="contrat-months">${c.statut === 'actif' ? moisRestants + ' mois restants' : ''}</span>
        </div>
      `;
    }).join('')
    : '<div class="empty-state">Aucun contrat en cours.</div>';
})();

document.querySelector('#logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.href = 'index.html';
});
