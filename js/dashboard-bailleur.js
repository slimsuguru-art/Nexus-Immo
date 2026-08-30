import { supabase } from './supabase.js';

const placeholderIcon = `<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>`;

function last6Months() {
  const now = new Date(), out = [];
  for (let i = 5; i >= 0; i--) out.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  return out;
}

function revenueSeries(contrats) {
  return last6Months().map(m => {
    const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    const total = contrats
      .filter(c => new Date(c.date_debut) <= monthEnd && new Date(c.date_fin) >= m)
      .reduce((sum, c) => sum + Number(c.loyer || 0), 0);
    return { label: m.toLocaleDateString('fr-FR', { month: 'short' }), total };
  });
}

function renderChart(series) {
  const w = 520, h = 150, pad = 26;
  const max = Math.max(1, ...series.map(s => s.total));
  const stepX = (w - pad * 2) / (series.length - 1 || 1);
  const pts = series.map((s, i) => [pad + i * stepX, h - pad - (s.total / max) * (h - pad * 2 - 16)]);
  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;
  const dots = pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="chart-dot"/>`).join('');
  const labels = series.map((s, i) => `<text x="${pts[i][0]}" y="${h - 6}" class="chart-label" text-anchor="middle">${s.label}</text>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="revenue-chart" preserveAspectRatio="none">
    <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" class="chart-axis"/>
    <path d="${area}" class="chart-area"/>
    <path d="${line}" class="chart-line"/>
    ${dots}${labels}
  </svg>`;
}

function renderRing(list) {
  const total = list.length;
  const rented = list.filter(p => p.status === 'rented').length;
  const pct = total ? Math.round((rented / total) * 100) : 0;
  const r = 42, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 100 100" class="occupancy-ring">
    <circle cx="50" cy="50" r="${r}" class="ring-bg"/>
    <circle cx="50" cy="50" r="${r}" class="ring-fill" stroke-dasharray="${(pct / 100 * c).toFixed(1)} ${c.toFixed(1)}"/>
    <text x="50" y="56" text-anchor="middle" class="ring-label">${pct}%</text>
  </svg><p class="ring-caption">${rented} logement(s) loué(s) sur ${total}</p>`;
}

function renderUpcoming(contrats) {
  const now = new Date();
  const soon = contrats
    .filter(c => c.statut === 'actif')
    .map(c => ({ ...c, joursRestants: Math.round((new Date(c.date_fin) - now) / 86400000) }))
    .filter(c => c.joursRestants >= 0 && c.joursRestants <= 60)
    .sort((a, b) => a.joursRestants - b.joursRestants);

  if (!soon.length) return '<p class="upcoming-empty">Aucune échéance dans les 60 prochains jours.</p>';

  return soon.map(c => `
    <div class="upcoming-row${c.joursRestants <= 15 ? ' upcoming-row--urgent' : ''}">
      <div>
        <strong>${c.properties?.title || 'Logement'}</strong>
        <span>${c.profiles?.full_name || 'Locataire'}</span>
      </div>
      <span class="upcoming-days">${c.joursRestants} j</span>
    </div>
  `).join('');
}

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

  const series = revenueSeries(contratList);
  document.querySelector('#revenueTotal').textContent =
    series[series.length - 1].total.toLocaleString('fr-FR') + ' FCFA / mois';
  document.querySelector('#revenueChart').innerHTML = renderChart(series);
  document.querySelector('#occupancyRing').innerHTML = renderRing(list);
  document.querySelector('#upcomingList').innerHTML = renderUpcoming(contratList);

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
        <article class="property-card" data-property="${p.id}">
          ${p.image_url ? `<img class="property-image" src="${p.image_url}" alt="">` : `<div class="property-image--placeholder">${placeholderIcon}</div>`}
          <div class="property-body">
            <h3>${p.title}</h3>
            <div class="property-meta">${p.city || ''} · ${p.status === 'rented' ? 'Louée' : p.status === 'draft' ? 'Retirée' : 'Disponible'}</div>
            <div class="property-price">${Number(p.price || 0).toLocaleString('fr-FR')} FCFA</div>
            <div class="property-actions">
              <a class="btn-chip" href="publish.html?edit=${p.id}">Modifier</a>
              ${p.status === 'available' ? `<a class="btn-chip" href="contrat-nouveau.html?property=${p.id}">Créer un contrat</a>` : ''}
              <button class="btn-chip" data-toggle="${p.id}" data-status="${p.status}">${p.status === 'rented' ? 'Marquer disponible' : 'Marquer louée'}</button>
              <button class="btn-chip btn-chip--danger" data-delete="${p.id}">Supprimer</button>
            </div>
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

  grid.addEventListener('click', async e => {
    const toggleBtn = e.target.closest('[data-toggle]');
    const deleteBtn = e.target.closest('[data-delete]');

    if (toggleBtn) {
      const id = toggleBtn.dataset.toggle;
      const next = toggleBtn.dataset.status === 'rented' ? 'available' : 'rented';
      toggleBtn.disabled = true;
      const { error } = await supabase.from('properties').update({ status: next }).eq('id', id);
      if (!error) location.reload();
      else toggleBtn.disabled = false;
    }

    if (deleteBtn) {
      if (!confirm('Supprimer définitivement cette annonce ?')) return;
      const id = deleteBtn.dataset.delete;
      deleteBtn.disabled = true;
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (!error) deleteBtn.closest('.property-card').remove();
      else deleteBtn.disabled = false;
    }
  });
})();

document.querySelector('#logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.href = 'index.html';
});
