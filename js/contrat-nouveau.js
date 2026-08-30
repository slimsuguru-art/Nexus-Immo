import { supabase } from './supabase.js';

const area = document.querySelector('#contratArea');
const propertyId = new URLSearchParams(location.search).get('property');

function emptyState(title, text, backHref = 'dashboard.html', backLabel = 'Retour à mon espace') {
  area.innerHTML = `
    <div class="property-empty">
      <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>
      <h2>${title}</h2>
      <p>${text}</p>
      <a class="btn btn-primary" href="${backHref}">${backLabel}</a>
    </div>`;
}

(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname + location.search);
    return;
  }
  if (user.user_metadata?.role === 'locataire') {
    location.replace('dashboard-locataire.html');
    return;
  }
  if (!propertyId) {
    emptyState('Aucun logement sélectionné', "Ouvrez cette page depuis l'un de vos logements, sur votre dashboard.");
    return;
  }

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single();

  if (!property) {
    emptyState('Logement introuvable', "Cette annonce n'existe plus ou ne vous appartient pas.");
    return;
  }

  document.querySelector('#contratTitle').textContent = `Créer un contrat — ${property.title}`;

  // Les candidats possibles sont uniquement les personnes qui ont réellement
  // écrit au bailleur au sujet de ce logement — pas de saisie libre d'email,
  // pour rester cohérent avec le principe "aucune donnée fictive".
  const { data: messages } = await supabase
    .from('messages')
    .select('sender_id, profiles!messages_sender_id_fkey(full_name)')
    .eq('property_id', propertyId)
    .eq('recipient_id', user.id);

  const candidats = [];
  const seen = new Set();
  (messages || []).forEach(m => {
    if (!seen.has(m.sender_id)) {
      seen.add(m.sender_id);
      candidats.push({ id: m.sender_id, nom: m.profiles?.full_name || 'Locataire' });
    }
  });

  if (!candidats.length) {
    emptyState(
      'Aucun candidat pour le moment',
      "Personne n'a encore écrit au sujet de ce logement via la messagerie KAZA. Un contrat ne peut être créé qu'avec quelqu'un qui vous a réellement contacté.",
      'dashboard-bailleur.html',
      'Retour à mes annonces'
    );
    return;
  }

  area.innerHTML = `
    <form id="contratForm" class="form-card">
      <label>Locataire
        <select id="locataireId" required>
          ${candidats.map(c => `<option value="${c.id}">${c.nom}</option>`).join('')}
        </select>
      </label>
      <div class="form-grid">
        <label>Date de début<input id="dateDebut" type="date" required></label>
        <label>Date de fin<input id="dateFin" type="date" required></label>
      </div>
      <label>Loyer mensuel (FCFA)<input id="loyer" type="number" min="0" value="${property.price || ''}" required></label>
      <button class="btn btn-primary">Créer le contrat</button>
      <div id="contratMessage" class="form-message"></div>
    </form>`;

  document.querySelector('#contratForm').addEventListener('submit', async e => {
    e.preventDefault();
    const m = document.querySelector('#contratMessage');
    const dateDebut = document.querySelector('#dateDebut').value;
    const dateFin = document.querySelector('#dateFin').value;

    if (new Date(dateFin) <= new Date(dateDebut)) {
      m.textContent = 'La date de fin doit être après la date de début.';
      return;
    }

    m.textContent = 'Création du contrat…';

    const { error: contratError } = await supabase.from('contrats').insert({
      property_id: propertyId,
      bailleur_id: user.id,
      locataire_id: document.querySelector('#locataireId').value,
      date_debut: dateDebut,
      date_fin: dateFin,
      loyer: Number(document.querySelector('#loyer').value),
      statut: 'actif'
    });

    if (contratError) {
      m.textContent = contratError.message;
      return;
    }

    await supabase.from('properties').update({ status: 'rented' }).eq('id', propertyId);

    m.textContent = 'Contrat créé — le logement est marqué loué.';
    setTimeout(() => location.href = 'dashboard-bailleur.html', 900);
  });
})();
