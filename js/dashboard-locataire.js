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
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <path d="M20 55 60 25 100 55"/>
          <path d="M28 52v40h64V52"/>
          <path d="M50 92V68h20v24"/>
          <circle cx="90" cy="32" r="11"/>
          <path d="M98 40 111 53"/>
          <path d="M103 48l5-5"/>
        </svg>
        <h2>Pas encore de logement</h2>
        <p>Dès qu'un bailleur vous ajoute à un contrat sur KAZA, votre logement, la durée de votre bail et son contact apparaissent ici.</p>
        <div class="lease-empty-actions">
          <a class="btn btn-primary" href="index.html#annonces">Chercher un logement</a>
          <a class="btn btn-ghost" href="comment-ca-marche.html">Comment ça marche</a>
        </div>
        <p class="lease-empty-note">Aucune donnée fictive : cet espace ne se remplit qu'avec de vrais contrats.</p>
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
