import { supabase } from './supabase.js';

const fallbackImg = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80';

(async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    location.replace('login.html');
    return;
  }
  if (user.user_metadata?.role === 'bailleur') {
    location.replace('dashboard-bailleur.html');
    return;
  }

  document.querySelector('#welcome').textContent = `Bonjour ${user.user_metadata?.full_name || ''}`;

  const { data: contrats } = await supabase
    .from('contrats')
    .select('*, properties(title, city, district, image_url), profiles!contrats_bailleur_id_fkey(full_name)')
    .eq('locataire_id', user.id)
    .eq('statut', 'actif')
    .order('date_debut', { ascending: false })
    .limit(1);

  const contrat = contrats?.[0];
  const box = document.querySelector('#leaseCard');

  if (!contrat) {
    box.innerHTML = `
      <div class="lease-empty">
        <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>
        <h2>Aucune location en cours</h2>
        <p>Vous n'avez pas de bail actif sur KAZA pour le moment.</p>
        <a class="btn btn-primary" href="index.html#annonces">Chercher un logement</a>
      </div>`;
    return;
  }

  const debut = new Date(contrat.date_debut);
  const fin = new Date(contrat.date_fin);
  const aujourdhui = new Date();
  const totalJours = Math.max(1, (fin - debut) / 86400000);
  const joursEcoules = Math.min(totalJours, Math.max(0, (aujourdhui - debut) / 86400000));
  const progression = Math.round((joursEcoules / totalJours) * 100);
  const moisRestants = Math.max(0, Math.round((fin - aujourdhui) / 86400000 / 30));
  const p = contrat.properties || {};
  const bailleur = contrat.profiles || {};

  box.innerHTML = `
    <img class="lease-image" src="${p.image_url || fallbackImg}" alt="">
    <div class="lease-body">
      <span class="eyebrow">Votre logement</span>
      <h2>${p.title || 'Logement'}</h2>
      <p class="lease-address">${p.city || ''}${p.district ? ' — ' + p.district : ''}</p>
      <div class="lease-progress">
        <div class="lease-progress-bar"><div class="lease-progress-fill" style="width:${progression}%"></div></div>
        <div class="lease-progress-label"><strong>${moisRestants}</strong> mois restants — échéance le ${fin.toLocaleDateString('fr-FR')}</div>
      </div>
      <div class="lease-contact">
        <div>
          <span>Bailleur</span>
          <strong>${bailleur.full_name || '—'}</strong>
        </div>
        <a class="btn btn-ghost btn-sm" href="mailto:?subject=${encodeURIComponent('KAZA - ' + (p.title || ''))}">Contacter</a>
      </div>
    </div>`;
})();

document.querySelector('#logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.href = 'index.html';
});
