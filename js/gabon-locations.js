// Villes et quartiers réels du Gabon, utilisés à la fois pour la recherche
// et pour la publication d'annonces — aucun logement ni quartier fictif.
// Sources : découpage administratif de Libreville (6 arrondissements),
// Akanda et Owendo (agglomération de la capitale), Port-Gentil et
// Franceville. Liste non exhaustive, à compléter au besoin.

export const villes = [
  {
    nom: 'Libreville',
    quartiers: [
      'Batterie IV', 'Haut de Gué-Gué', 'Bas de Gué-Gué', 'Louis',
      'La Campagne', 'Cocotiers', 'Nkembo',
      'Nombakélé', 'Mont-Bouët', 'Plateau', 'Akébé',
      'London', 'Glass', 'Baraka', 'Oloumi', 'Lalala', 'Plaine Niger',
      'IAI', 'Mindoubé',
      'Nzeng-Ayong'
    ]
  },
  {
    nom: 'Akanda',
    quartiers: [
      'Avorbam', 'Beaulieu', 'Cap Estérias', '1er Campement',
      'Okala', 'Delta Postal', 'Sablière', 'Gigi', 'Sherko', 'Entraco'
    ]
  },
  {
    nom: 'Owendo',
    quartiers: ['Carrefour SNI', 'Cité SNI', 'Cité OCTRA', 'Cité COMILOG']
  },
  {
    nom: 'Port-Gentil',
    quartiers: [
      'Centre-ville', 'Cap Lopez', 'Sainte-Anne', 'Quartier Littoral',
      'Sobraga', 'Matanda', 'Montagne Sainte', 'Olowé', 'Ntchengue',
      'Grand Village', 'Chapuis'
    ]
  },
  {
    nom: 'Franceville',
    quartiers: ['Centre-ville', 'Potos', 'Mbaya', 'Poto-Poto']
  }
];

export function quartiersDe(nomVille) {
  const ville = villes.find(v => v.nom === nomVille);
  return ville ? ville.quartiers : villes.flatMap(v => v.quartiers);
}
