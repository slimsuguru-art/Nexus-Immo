import {
  supabase
} from './supabase.js';
import {
  villes,
  quartiersDe
} from './gabon-locations.js';

const grid = document.querySelector('#propertyGrid');
let all = [];

const searchVille = document.querySelector('#searchVille');
const searchQuartier = document.querySelector('#searchQuartier');

function fillQuartiers(nomVille) {
  const options = quartiersDe(nomVille);
  searchQuartier.innerHTML = '<option value="">Tous quartiers</option>' +
    options.map(q => `<option>${q}</option>`).join('');
}

if (searchVille) {
  searchVille.innerHTML = '<option value="">Toutes villes</option>' +
    villes.map(v => `<option>${v.nom}</option>`).join('');
  fillQuartiers('');
  searchVille.addEventListener('change', () => fillQuartiers(searchVille.value));
}

const placeholder = `<div class="property-image--placeholder"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg></div>`;

function card(p) {
  const image = p.image_url
    ? `<img class="property-image" src="${p.image_url}" alt="">`
    : placeholder;
  const badge = p.type ? `<span class="property-badge">${p.type}</span>` : '';
  return `<article class="property-card"><a href="property.html?id=${p.id}"><div class="property-media">${image}${badge}</div><div class="property-body"><h3>${p.title||'Sans titre'}</h3><div class="property-meta">${p.city||''}${p.district?' · '+p.district:''} · ${p.rooms||'-'} pièce(s)</div><div class="property-price">${Number(p.price||0).toLocaleString('fr-FR')} FCFA / mois</div></div></a></article>`;
}

function emptyState(title, text) {
  return `<div class="empty-state empty-state--rich"><svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 0 4.9 12l4.6 4.6M11 4a7 7 0 0 1 7 7"/></svg><h3>${title}</h3><p>${text}</p></div>`;
}

function render(x) {
  grid.innerHTML = x.length
    ? x.map(card).join('')
    : emptyState('Aucun logement trouvé', 'Essayez une autre ville ou élargissez votre budget.');
}

async function load() {
  const {
    data,
    error
  } = await supabase.from('properties').select('*').eq('status', 'available').order('created_at', {
    ascending: false
  });
  if (error) {
    grid.innerHTML = emptyState('Aucune annonce pour l\'instant', 'KAZA n\'affiche que des logements réels : soyez le premier à publier le vôtre.');
    return;
  }
  all = data || [];
  render(all);
}

document.querySelector('#searchForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const ville = searchVille.value,
    quartier = searchQuartier.value,
    t = searchType.value,
    max = Number(searchMaxPrice.value) || Infinity;
  render(all.filter(p =>
    (!ville || p.city === ville) &&
    (!quartier || p.district === quartier) &&
    (!t || p.type === t) &&
    Number(p.price || 0) <= max
  ));
});

load();
