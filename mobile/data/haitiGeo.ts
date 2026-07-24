/**
 * Haiti administrative geography — Département → Arrondissement → Commune.
 *
 * The mobile create-event canvas uses this for a three-level dependent cascade
 * when the selected country is Haiti (HT). The "City" level surfaces each
 * arrondissement labeled by its chef-lieu / main city, so the stored `city`
 * value stays a recognizable town name that Discovery filters can match — we
 * NEVER store a department name into `city`.
 *
 * Coverage: 10 départements, 42 arrondissements, 140 communes.
 * Spellings follow standard French/Haitian usage.
 */

export interface HaitiCity {
  /** Arrondissement label = its chef-lieu / main city name. */
  name: string;
  communes: string[];
}

export interface HaitiDepartment {
  name: string;
  cities: HaitiCity[];
}

export const HAITI_GEO: HaitiDepartment[] = [
  {
    name: 'Ouest',
    cities: [
      {
        name: 'Port-au-Prince',
        communes: [
          'Port-au-Prince',
          'Carrefour',
          'Delmas',
          'Pétion-Ville',
          'Kenscoff',
          'Gressier',
          'Tabarre',
          'Cité Soleil',
        ],
      },
      {
        name: 'Léogâne',
        communes: ['Léogâne', 'Grand-Goâve', 'Petit-Goâve'],
      },
      {
        name: 'Croix-des-Bouquets',
        communes: [
          'Croix-des-Bouquets',
          'Ganthier',
          'Thomazeau',
          'Cornillon',
          'Fonds-Verrettes',
        ],
      },
      {
        name: 'Arcahaie',
        communes: ['Arcahaie', 'Cabaret'],
      },
      {
        name: 'La Gonâve',
        communes: ['Anse-à-Galets', 'Pointe-à-Raquette'],
      },
    ],
  },
  {
    name: 'Sud-Est',
    cities: [
      {
        name: 'Jacmel',
        communes: ['Jacmel', 'Marigot', 'Cayes-Jacmel', 'La Vallée'],
      },
      {
        name: 'Bainet',
        communes: ['Bainet', 'Côtes-de-Fer'],
      },
      {
        name: 'Belle-Anse',
        communes: ['Belle-Anse', 'Grand-Gosier', 'Thiotte', 'Anse-à-Pitres'],
      },
    ],
  },
  {
    name: 'Nord',
    cities: [
      {
        name: 'Cap-Haïtien',
        communes: ['Cap-Haïtien', 'Quartier-Morin', 'Limonade'],
      },
      {
        name: 'Acul-du-Nord',
        communes: ['Acul-du-Nord', 'Milot', 'Plaine-du-Nord'],
      },
      {
        name: 'Grande-Rivière-du-Nord',
        communes: ['Grande-Rivière-du-Nord', 'Bahon'],
      },
      {
        name: 'Saint-Raphaël',
        communes: ['Saint-Raphaël', 'Dondon', 'Ranquitte', 'Pignon', 'La Victoire'],
      },
      {
        name: 'Borgne',
        communes: ['Le Borgne', 'Port-Margot'],
      },
      {
        name: 'Plaisance',
        communes: ['Plaisance', 'Pilate'],
      },
      {
        name: 'Limbé',
        communes: ['Limbé', 'Bas-Limbé'],
      },
    ],
  },
  {
    name: 'Nord-Est',
    cities: [
      {
        name: 'Fort-Liberté',
        communes: ['Fort-Liberté', 'Ferrier', 'Perches'],
      },
      {
        name: 'Ouanaminthe',
        communes: ['Ouanaminthe', 'Capotille', 'Mont-Organisé'],
      },
      {
        name: 'Trou-du-Nord',
        communes: ['Trou-du-Nord', 'Sainte-Suzanne', 'Terrier-Rouge', 'Caracol'],
      },
      {
        name: 'Vallières',
        communes: ['Vallières', 'Carice', 'Mombin-Crochu'],
      },
    ],
  },
  {
    name: 'Artibonite',
    cities: [
      {
        name: 'Gonaïves',
        communes: ['Gonaïves', 'Ennery', "L'Estère"],
      },
      {
        name: 'Saint-Marc',
        communes: ['Saint-Marc', 'Verrettes', 'La Chapelle'],
      },
      {
        name: 'Dessalines',
        communes: [
          'Dessalines',
          "Petite-Rivière-de-l'Artibonite",
          'Grande-Saline',
          'Desdunes',
        ],
      },
      {
        name: 'Gros-Morne',
        communes: ['Gros-Morne', 'Anse-Rouge', 'Terre-Neuve'],
      },
      {
        name: 'Marmelade',
        communes: ['Marmelade', "Saint-Michel-de-l'Attalaye"],
      },
    ],
  },
  {
    name: 'Centre',
    cities: [
      {
        name: 'Hinche',
        communes: ['Hinche', 'Maïssade', 'Thomonde', 'Cerca-Carvajal'],
      },
      {
        name: 'Mirebalais',
        communes: ['Mirebalais', "Saut-d'Eau", 'Boucan-Carré'],
      },
      {
        name: 'Lascahobas',
        communes: ['Lascahobas', 'Belladère', 'Savanette'],
      },
      {
        name: 'Cerca-la-Source',
        communes: ['Cerca-la-Source', 'Thomassique'],
      },
    ],
  },
  {
    name: 'Sud',
    cities: [
      {
        name: 'Les Cayes',
        communes: [
          'Les Cayes',
          'Torbeck',
          'Chantal',
          'Camp-Perrin',
          'Maniche',
          'Île-à-Vache',
        ],
      },
      {
        name: 'Aquin',
        communes: ['Aquin', 'Cavaillon', 'Saint-Louis-du-Sud'],
      },
      {
        name: 'Côteaux',
        communes: ['Côteaux', 'Roche-à-Bateau', 'Port-à-Piment'],
      },
      {
        name: 'Chardonnières',
        communes: ['Chardonnières', 'Les Anglais', 'Tiburon'],
      },
      {
        name: 'Port-Salut',
        communes: ['Port-Salut', 'Arniquet', 'Saint-Jean-du-Sud'],
      },
    ],
  },
  {
    name: "Grand'Anse",
    cities: [
      {
        name: 'Jérémie',
        communes: ['Jérémie', 'Abricots', 'Bonbon', 'Moron', 'Chambellan'],
      },
      {
        name: 'Corail',
        communes: ['Corail', 'Roseaux', 'Pestel', 'Beaumont'],
      },
      {
        name: "Anse-d'Hainault",
        communes: ["Anse-d'Hainault", 'Dame-Marie', 'Les Irois'],
      },
    ],
  },
  {
    name: 'Nord-Ouest',
    cities: [
      {
        name: 'Port-de-Paix',
        communes: ['Port-de-Paix', 'Bassin-Bleu', 'Chansolme', 'La Tortue'],
      },
      {
        name: 'Saint-Louis-du-Nord',
        communes: ['Saint-Louis-du-Nord', 'Anse-à-Foleur'],
      },
      {
        name: 'Môle-Saint-Nicolas',
        communes: [
          'Môle-Saint-Nicolas',
          'Baie-de-Henne',
          'Bombardopolis',
          'Jean-Rabel',
        ],
      },
    ],
  },
  {
    name: 'Nippes',
    cities: [
      {
        name: 'Miragoâne',
        communes: [
          'Miragoâne',
          'Fonds-des-Nègres',
          'Petite-Rivière-de-Nippes',
          'Paillant',
        ],
      },
      {
        name: 'Anse-à-Veau',
        communes: [
          'Anse-à-Veau',
          "L'Asile",
          'Petit-Trou-de-Nippes',
          'Arnaud',
          'Plaisance-du-Sud',
        ],
      },
      {
        name: 'Baradères',
        communes: ['Baradères', 'Grand-Boucan'],
      },
    ],
  },
];

export const HAITI_DEPARTMENTS: string[] = HAITI_GEO.map((d) => d.name);

/** Arrondissements (surfaced as "cities") for a département. */
export function citiesForDepartment(dep: string): HaitiCity[] {
  return HAITI_GEO.find((d) => d.name === dep)?.cities ?? [];
}

/** Communes for a given (département, city/arrondissement) pair. */
export function communesForCity(dep: string, city: string): string[] {
  const cities = citiesForDepartment(dep);
  return cities.find((c) => c.name === city)?.communes ?? [];
}

/** Find which département contains a given city (arrondissement main city). */
export function departmentForCity(city: string): string | '' {
  for (const d of HAITI_GEO) {
    if (d.cities.some((c) => c.name === city)) return d.name;
  }
  return '';
}
