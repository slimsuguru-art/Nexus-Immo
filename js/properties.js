import {
  supabase
} from './supabase.js';
import {
  villes,
  quartiersDe
} from './gabon-locations.js';

const cityField = document.querySelector('#city');
const districtField = document.querySelector('#district');

function fillDistricts(nomVille) {
  districtField.innerHTML = quartiersDe(nomVille).map(q => `<option>${q}</option>`).join('');
}

if (cityField) {
  cityField.innerHTML = villes.map(v => `<option>${v.nom}</option>`).join('');
  fillDistricts(cityField.value);
  cityField.addEventListener('change', () => fillDistricts(cityField.value));
}
const params = new URLSearchParams(location.search),
  id = params.get('id'),
  detail = document.querySelector('#propertyDetail');
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
  const image = p.image_url
    ? `<img class="detail-image" src="${p.image_url}" alt="">`
    : `<div class="detail-image detail-image--placeholder"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg></div>`;
  detail.innerHTML =
    `<div>${image}</div><div class="detail-card"><span class="eyebrow">${p.type||'Logement'}</span><h1>${p.title}</h1><div class="detail-price">${Number(p.price||0).toLocaleString('fr-FR')} FCFA / mois</div><p>${p.description||''}</p><p><strong>Localisation</strong><br>${p.city||''}${p.district?' — '+p.district:''}</p><p><strong>Pièces</strong><br>${p.rooms||'-'}</p><a class="btn btn-primary" href="mailto:?subject=KAZA - ${encodeURIComponent(p.title)}">Contacter le bailleur</a></div>`
})();
const pf = document.querySelector('#publishForm');
const imageInput = document.querySelector('#imageFile');
const preview = document.querySelector('#uploadPreview');
const previewDefault = preview?.innerHTML;

imageInput?.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    preview.classList.add('has-image');
    preview.innerHTML = `<img src="${reader.result}" alt="Aperçu du logement">`;
  };
  reader.readAsDataURL(file);
});

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

  let image_url = null;
  const file = imageInput?.files[0];
  if (file) {
    m.textContent = 'Envoi de la photo…';
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const {
      error: uploadError
    } = await supabase.storage.from('property-images').upload(path, file);
    if (uploadError) {
      m.textContent = "Erreur lors de l'envoi de la photo : " + uploadError.message;
      return
    }
    const {
      data: pub
    } = supabase.storage.from('property-images').getPublicUrl(path);
    image_url = pub.publicUrl;
  }

  m.textContent = 'Publication…';
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
    image_url,
    status: 'available'
  });
  if (error) {
    m.textContent = error.message;
    return
  }
  m.textContent = 'Annonce publiée avec succès.';
  pf.reset();
  if (preview) {
    preview.classList.remove('has-image');
    preview.innerHTML = previewDefault;
  }
  setTimeout(() => location.href = 'dashboard.html', 700)
});
