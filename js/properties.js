import {
  supabase
} from './supabase.js';
const params = new URLSearchParams(location.search),
  id = params.get('id'),
  detail = document.querySelector('#propertyDetail'),
  fallback = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80';
const emptyState = (title, text) =>
  `<div class="property-empty"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg><h2>${title}</h2><p>${text}</p><a class="btn btn-primary" href="index.html#annonces">Voir les logements</a></div>`;
if (detail)(async () => {
  if (!id) {
    detail.innerHTML = emptyState('Aucun logement sélectionné',
      'Cette page affiche le détail d\'une annonce précise. Choisissez un logement depuis la liste pour voir sa fiche.');
    return
  }
  const {
    data: p
  } = await supabase.from('properties').select('*').eq('id', id).single();
  if (!p) {
    detail.innerHTML = emptyState('Annonce introuvable', 'Ce logement n\'existe plus ou l\'adresse est incorrecte.');
    return
  }
  detail.innerHTML =
    `<div><img class="detail-image" src="${p.image_url||fallback}" alt=""></div><div class="detail-card"><span class="eyebrow">${p.type||'Logement'}</span><h1>${p.title}</h1><div class="detail-price">${Number(p.price||0).toLocaleString('fr-FR')} FCFA / mois</div><p>${p.description||''}</p><p><strong>Localisation</strong><br>${p.city||''}${p.district?' — '+p.district:''}</p><p><strong>Pièces</strong><br>${p.rooms||'-'}</p><a class="btn btn-primary" href="mailto:?subject=KAZA - ${encodeURIComponent(p.title)}">Contacter le bailleur</a></div>`
})();
const pf = document.querySelector('#publishForm');
if (pf)(async () => {
  const {
    data: {
      user
    }
  } = await supabase.auth.getUser();
  if (!user) {
    location.href = 'login.html?redirect=publish.html';
    return
  }
  if (user.user_metadata?.role === 'locataire') {
    location.href = 'dashboard-locataire.html';
    return
  }
})();
if (pf) pf.addEventListener('submit', async e => {
  e.preventDefault();
  const m = document.querySelector('#publishMessage'),
    {
      data: {
        user
      }
    } = await supabase.auth.getUser();
  if (!user) {
    m.textContent = 'Connectez-vous pour publier.';
    return
  }
  const {
    error
  } = await supabase.from('properties').insert({
    owner_id: user.id,
    title: title.value,
    description: description.value,
    type: type.value,
    price: Number(price.value),
    city: city.value,
    district: district.value,
    rooms: Number(rooms.value),
    image_url: image_url.value || null,
    status: 'available'
  });
  if (error) {
    m.textContent = error.message;
    return
  }
  m.textContent = 'Annonce publiée avec succès.';
  pf.reset();
  setTimeout(() => location.href = 'dashboard.html', 700)
});
