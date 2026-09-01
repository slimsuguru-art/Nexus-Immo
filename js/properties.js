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

  const roomCount = Math.min(Number(p.rooms) || 0, 8);
  const roomPlan = roomCount
    ? `<div class="room-plan">${Array.from({ length: roomCount }, (_, i) => `<div class="room-plan-cell">Pièce ${i + 1}</div>`).join('')}</div>
       <p class="room-plan-caption">Schéma indicatif du nombre de pièces — ne représente pas l'agencement réel du logement.</p>`
    : '';

  const { count: contratCount } = await supabase
    .from('contrats')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', id);

  const historique = contratCount
    ? `<p class="rental-history"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3.5 2"/></svg>${contratCount === 1 ? '1ère location suivie sur KAZA' : contratCount + ' locations suivies sur KAZA'}</p>`
    : '';

  detail.innerHTML =
    `<div>${image}</div><div class="detail-card"><span class="eyebrow">${p.type||'Logement'}</span><h1>${p.title}</h1><div class="detail-price">${Number(p.price||0).toLocaleString('fr-FR')} FCFA / mois</div><p>${p.description||''}</p><p><strong>Localisation</strong><br>${p.city||''}${p.district?' — '+p.district:''}</p><p><strong>Pièces</strong><br>${p.rooms||'-'}</p>${roomPlan}${historique}<a class="btn btn-primary" href="messagerie.html?with=${p.owner_id}&property=${p.id}">Contacter le bailleur</a><div class="visit-request"><label>Demander une visite<input type="date" id="visitDate"></label><button id="visitBtn" class="btn btn-ghost" type="button">Planifier une visite</button></div></div>`;

  document.querySelector('#visitBtn')?.addEventListener('click', async () => {
    const dateVal = document.querySelector('#visitDate').value;
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const msg = dateVal
      ? `Bonjour, je souhaiterais visiter ce logement le ${new Date(dateVal).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}. Est-ce possible ?`
      : 'Bonjour, serait-il possible de visiter ce logement ?';
    const target = `messagerie.html?with=${p.owner_id}&property=${p.id}&msg=${encodeURIComponent(msg)}`;
    location.href = user ? target : `login.html?redirect=${encodeURIComponent(target)}`;
  });
})();
const pf = document.querySelector('#publishForm');
const imageInput = document.querySelector('#imageFile');
const preview = document.querySelector('#uploadPreview');
const previewDefault = preview?.innerHTML;
const editId = new URLSearchParams(location.search).get('edit');
let existingImageUrl = null;

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

  if (editId) {
    const {
      data: p
    } = await supabase.from('properties').select('*').eq('id', editId).eq('owner_id', user.id).single();
    if (!p) {
      document.querySelector('#publishMessage').textContent = "Annonce introuvable ou vous n'en êtes pas propriétaire.";
      pf.querySelector('button').disabled = true;
      return
    }
    document.querySelector('#publishTitle').textContent = "Modifier l'annonce";
    pf.querySelector('button').textContent = 'Enregistrer les modifications';
    title.value = p.title || '';
    description.value = p.description || '';
    type.value = p.type || 'Appartement';
    price.value = p.price || '';
    cityField.value = p.city || villes[0].nom;
    fillDistricts(cityField.value);
    districtField.value = p.district || '';
    rooms.value = p.rooms || '';
    existingImageUrl = p.image_url || null;
    if (existingImageUrl && preview) {
      preview.classList.add('has-image');
      preview.innerHTML = `<img src="${existingImageUrl}" alt="Photo actuelle">`;
    }
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

  let image_url = editId ? existingImageUrl : null;
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

  const payload = {
    title: title.value,
    description: description.value,
    type: type.value,
    price: Number(price.value),
    city: city.value,
    district: district.value,
    rooms: Number(rooms.value),
    image_url
  };

  let error;
  if (editId) {
    m.textContent = 'Enregistrement…';
    ({
      error
    } = await supabase.from('properties').update(payload).eq('id', editId).eq('owner_id', user.id));
  } else {
    m.textContent = 'Publication…';
    ({
      error
    } = await supabase.from('properties').insert({
      ...payload,
      owner_id: user.id,
      status: 'available'
    }));
  }
  if (error) {
    m.textContent = error.message;
    return
  }
  m.textContent = editId ? 'Modifications enregistrées.' : 'Annonce publiée avec succès.';
  if (!editId) {
    pf.reset();
    if (preview) {
      preview.classList.remove('has-image');
      preview.innerHTML = previewDefault;
    }
  }
  setTimeout(() => location.href = 'dashboard.html', 700)
});
