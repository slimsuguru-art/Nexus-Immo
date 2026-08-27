import {
  supabase
} from './supabase.js';
const grid = document.querySelector('#propertyGrid');
let all = [];
const fallback = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80';

function card(p) {
  return `<article class="property-card"><a href="property.html?id=${p.id}"><img class="property-image" src="${p.image_url||fallback}" alt=""><div class="property-body"><h3>${p.title||'Sans titre'}</h3><div class="property-meta">${p.type||''} · ${p.city||''}${p.district?' · '+p.district:''} · ${p.rooms||'-'} pièce(s)</div><div class="property-price">${Number(p.price||0).toLocaleString('fr-FR')} FCFA / mois</div></div></a></article>`
}

function render(x) {
  grid.innerHTML = x.length ? x.map(card).join('') : '<div class="empty-state">Aucun logement trouvé.</div>'
}
async function load() {
  const {
    data,
    error
  } = await supabase.from('properties').select('*').eq('status', 'available').order('created_at', {
    ascending: false
  });
  if (error) {
    grid.innerHTML = '<div class="empty-state">Configurez la base Supabase avec supabase_schema.sql.</div>';
    return
  }
  all = data || [];
  render(all)
}
document.querySelector('#searchForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const q = searchLocation.value.toLowerCase().trim(),
    t = searchType.value,
    max = Number(searchMaxPrice.value) || Infinity;
  render(all.filter(p => (!q || `${p.city||''} ${p.district||''}`.toLowerCase().includes(q)) && (!t || p.type === t) && Number(p.price || 0) <= max))
});
load();
