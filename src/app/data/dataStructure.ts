export type AttributeType = 'string' | 'number' | 'date' | 'boolean' | 'document';

export interface Attribute {
  id: string;
  name: string;
  type: AttributeType;
  required?: boolean;
  magicSel?: boolean;
}

export interface ObjectRelation {
  targetObjectId: string;
  targetThemeId: string;
  targetObjectName: string;
  cardinality: string;
  label: string;
  recursiveMagicSel?: boolean;
}

export type SmartObjectFilterOperator =
  | 'equals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'contains';

export interface SmartObjectFilterCondition {
  attributePath: string;
  operator: SmartObjectFilterOperator;
  value: string | number | boolean | 'dateDuJour';
}

export interface SmartObjectDefinition {
  title: string;
  columns: string[];
  filters?: {
    logicalOperator: 'ET' | 'OU';
    conditions: SmartObjectFilterCondition[];
  };
}

export interface DataObject {
  id: string;
  name: string;
  cardinality: string;
  attributes: Attribute[];
  applicationDate?: boolean;
  isApplicable?: boolean;
  relations?: ObjectRelation[];
  smartObjects?: SmartObjectDefinition[];
}

export interface Theme {
  id: string;
  name: string;
  objects: DataObject[];
}

const rel = (
  targetThemeId: string,
  targetObjectId: string,
  targetObjectName: string,
  label: string,
  cardinality = '1',
  recursiveMagicSel = false
): ObjectRelation => ({
  targetThemeId,
  targetObjectId,
  targetObjectName,
  label,
  cardinality,
  recursiveMagicSel,
});

export const dataStructure: Theme[] = [
  {
    id: 'collaborateurs',
    name: 'Les collaborateurs',
    objects: [
      {
        id: 'collaborateur',
        name: 'Collaborateur',
        cardinality: '1',
        attributes: [
          { id: 'photo', name: 'photo', type: 'document' },
          { id: 'titre', name: 'titre', type: 'string' },
          { id: 'nom', name: 'nom', type: 'string', magicSel: true },
          { id: 'prenom', name: 'prénom', type: 'string', magicSel: true },
          { id: 'genre', name: 'genre', type: 'string' },
          { id: 'date-naissance', name: 'date de naissance', type: 'date' },
          { id: 'age', name: 'âge', type: 'number' },
        ],
        relations: [
          rel('collaborateurs', 'matricules-login', 'Matricules et Login', 'Matricules et Login'),
          rel('collaborateurs', 'adresse-residence', 'Adresse de résidence', 'Adresse de résidence'),
          rel('collaborateurs', 'informations-contact', 'Informations contact', 'Informations contact'),
          rel('collaborateurs', 'contact-urgence', "Contact d'urgence", "Contact d'urgence"),
          rel('collaborateurs', 'documents-identite', "Documents d'identité", "Documents d'identité", '1..n'),
          rel('collaborateurs', 'enfants-charge', 'Enfants à charge', 'Enfants à charge', '0..n'),
          rel('collaborateurs', 'taille-goodies', 'Taille goodies', 'Taille goodies'),
        ],
      },
      {
        id: 'matricules-login',
        name: 'Matricules et Login',
        cardinality: '1 <> 1 Collaborateur',
        attributes: [
          { id: 'userId', name: 'userId', type: 'string' },
          { id: 'login', name: 'login', type: 'string' },
          { id: 'matricule-paie', name: 'matricule de paie', type: 'string' },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur')],
      },
      {
        id: 'adresse-residence',
        name: 'Adresse de résidence',
        cardinality: '1 <> 1 Collaborateur',
        attributes: [
          { id: 'rue', name: 'rue', type: 'string', magicSel: true },
          { id: 'complement', name: 'complément', type: 'string' },
          { id: 'code-postal', name: 'code postal', type: 'string', magicSel: true },
          { id: 'ville', name: 'ville', type: 'string', magicSel: true },
          { id: 'pays', name: 'pays', type: 'string' },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur')],
      },
      {
        id: 'informations-contact',
        name: 'Informations contact',
        cardinality: '1 <> 1 Collaborateur',
        attributes: [
          { id: 'email-personnel', name: 'email personnel', type: 'string' },
          { id: 'telephone-personnel', name: 'téléphone personnel', type: 'string', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur')],
      },
      {
        id: 'contact-urgence',
        name: "Contact d'urgence",
        cardinality: '1 <> 1 Collaborateur',
        attributes: [
          { id: 'nom-urgence', name: 'nom', type: 'string', magicSel: true },
          { id: 'relation', name: 'relation', type: 'string' },
          { id: 'telephone-urgence', name: 'téléphone', type: 'string', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur')],
      },
      {
        id: 'documents-identite',
        name: "Documents d'identité",
        cardinality: '1..n <> 1 Collaborateur',
        attributes: [
          { id: 'type-document', name: 'type de document', type: 'string' },
          { id: 'document', name: 'document', type: 'document', magicSel: true },
          { id: 'date-emission', name: 'date émission', type: 'date' },
          { id: 'date-expiration', name: 'date expiration', type: 'date', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur')],
      },
      {
        id: 'enfants-charge',
        name: 'Enfants à charge',
        cardinality: '0..n <> 1 Collaborateur',
        attributes: [
          { id: 'nom-enfant', name: 'nom', type: 'string' },
          { id: 'prenom-enfant', name: 'prénom', type: 'string', magicSel: true },
          { id: 'genre-enfant', name: 'genre', type: 'string' },
          { id: 'date-naissance-enfant', name: 'date de naissance', type: 'date', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur')],
      },
      {
        id: 'taille-goodies',
        name: 'Taille goodies',
        cardinality: '1 <> 1 Collaborateur',
        attributes: [
          { id: 'taille-cm', name: 'taille en cm', type: 'number' },
          { id: 'taille-tshirt', name: 'taille tshirt', type: 'string', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur')],
      },
    ],
  },
  {
    id: 'contrats',
    name: 'Les contrats',
    objects: [
      {
        id: 'contrats',
        name: 'Contrats',
        cardinality: '1..n <> 1 Collaborateur',
        applicationDate: true,
        isApplicable: true,
        attributes: [
          { id: 'type-contrat', name: 'type de contrat', type: 'string', magicSel: true },
          { id: 'document-contrat', name: 'document', type: 'document' },
          { id: 'date-signature', name: 'date signature', type: 'date' },
          { id: 'date-debut-contrat', name: 'date début', type: 'date', magicSel: true },
          { id: 'date-fin-contrat', name: 'date fin', type: 'date', magicSel: true },
          { id: 'motif-debut', name: 'motif début', type: 'string' },
          { id: 'motif-fin', name: 'motif fin', type: 'string' },
        ],
        relations: [
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur', '1', true),
          rel('contrats', 'postes', 'Postes', 'Postes', '1..n'),
        ],
      },
      {
        id: 'postes',
        name: 'Postes',
        cardinality: '1..n <> 1 Contrat, 0..n <> 1 Collaborateur manager, 0..n <> 1 Département, 0..n <> 1 Etablissement',
        applicationDate: true,
        isApplicable: true,
        attributes: [
          { id: 'intitule-poste', name: 'intitulé', type: 'string', magicSel: true },
          { id: 'document-poste', name: 'document', type: 'document' },
          { id: 'date-debut-poste', name: 'date début', type: 'date', magicSel: true },
          { id: 'date-fin-poste', name: 'date fin', type: 'date', magicSel: true },
          { id: 'qualifications', name: 'qualifications', type: 'string' },
          { id: 'csp', name: 'csp', type: 'string' },
          { id: 'modalite-temps-travail', name: 'modalité de temps de travail', type: 'string' },
        ],
        relations: [
          rel('contrats', 'contrats', 'Contrats', 'Contrat', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur manager'),
          rel('referentiels', 'departement', 'Département', 'Département', '1', true),
          rel('referentiels', 'etablissement', 'Etablissement', 'Etablissement', '1', true),
        ],
      },
    ],
  },
  {
    id: 'absences',
    name: 'Les absences',
    objects: [
      {
        id: 'absences-mod-alt',
        name: 'Absences',
        cardinality:
          "0..n <> 1 Collaborateur qui a posé l'absence, 0..n <> 1 Collaborateur qui bénéficie de l'absence, 0..n <> 1 Collaborateur qui a approuvé l'absence, 0..n <> 1 Collaborateur qui a refusé l'absence",
        attributes: [
          { id: 'type-compte-mod-alt', name: 'type compte', type: 'string', magicSel: true },
          { id: 'statut-mod-alt', name: 'statut', type: 'string', magicSel: true },
          { id: 'date-demande-mod-alt', name: 'date demande', type: 'date' },
          { id: 'date-refus-mod-alt', name: 'date refus', type: 'date', magicSel: true },
          { id: 'motivation-refus-mod-alt', name: 'motivation du refus', type: 'string', magicSel: true },
          { id: 'date-approbation-mod-alt', name: 'date approbation', type: 'date' },
          { id: 'date-debut-mod-alt', name: 'date début', type: 'date', magicSel: true },
          { id: 'date-fin-mod-alt', name: 'date fin', type: 'date', magicSel: true },
          { id: 'duree-reelle-mod-alt', name: 'durée réelle', type: 'number' },
          { id: 'duree-ouvree-mod-alt', name: 'durée ouvrée', type: 'number', magicSel: true },
        ],
        relations: [
          rel('collaborateurs', 'collaborateur', 'Collaborateur', "Collaborateur qui a posé l'absence"),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', "Collaborateur qui bénéficie de l'absence", '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', "Collaborateur qui a approuvé l'absence"),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', "Collaborateur qui a refusé l'absence"),
        ],
        smartObjects: [
          {
            title: 'Absences approuvées',
            columns: [
              'type compte',
              'date début',
              'date fin',
              'Collaborateur_Absence.nom',
              'Collaborateur_Absence.prénom',
              'Collaborateur_Approbation.nom',
              'Collaborateur_Approbation.prénom',
            ],
            filters: {
              logicalOperator: 'ET',
              conditions: [{ attributePath: 'statut', operator: 'equals', value: 'approuvé' }],
            },
          },
          {
            title: 'Absences à venir',
            columns: [
              'type compte',
              'date début',
              'date fin',
              'Collaborateur_Absence.nom',
              'Collaborateur_Absence.prénom',
              'Collaborateur_Approbation.nom',
              'Collaborateur_Approbation.prénom',
            ],
            filters: {
              logicalOperator: 'ET',
              conditions: [
                { attributePath: 'statut', operator: 'equals', value: 'approuvé' },
                { attributePath: 'date début', operator: 'greaterThan', value: 'dateDuJour' },
              ],
            },
          },
          {
            title: 'Absences passées',
            columns: [
              'type compte',
              'date début',
              'date fin',
              'Collaborateur_Absence.nom',
              'Collaborateur_Absence.prénom',
              'Collaborateur_Approbation.nom',
              'Collaborateur_Approbation.prénom',
            ],
            filters: {
              logicalOperator: 'ET',
              conditions: [
                { attributePath: 'statut', operator: 'equals', value: 'approuvé' },
                { attributePath: 'date début', operator: 'lessOrEqual', value: 'dateDuJour' },
              ],
            },
          },
          {
            title: 'Absences en attente de validation',
            columns: [
              'type compte',
              'durée ouvrée',
              'Collaborateur_Absence.nom',
              'Collaborateur_Absence.prénom',
              'Collaborateur_Absence.poste[applicable].manager.nom',
              'Collaborateur_Absence.poste[applicable].manager.prénom',
            ],
            filters: {
              logicalOperator: 'ET',
              conditions: [{ attributePath: 'statut', operator: 'equals', value: 'à traiter' }],
            },
          },
          {
            title: 'Absences passées refusées',
            columns: [
              'date refus',
              'motivation du refus',
              'durée ouvrée',
              'Collaborateur_Absence.nom',
              'Collaborateur_Absence.prénom',
              'Collaborateur_Refus.nom',
              'Collaborateur_Refus.prénom',
            ],
            filters: {
              logicalOperator: 'ET',
              conditions: [
                { attributePath: 'statut', operator: 'equals', value: 'refusé' },
                { attributePath: 'date début', operator: 'lessOrEqual', value: 'dateDuJour' },
              ],
            },
          },
          {
            title: 'Absences futures refusées',
            columns: [
              'date refus',
              'motivation du refus',
              'durée ouvrée',
              'Collaborateur_Absence.nom',
              'Collaborateur_Absence.prénom',
              'Collaborateur_Refus.nom',
              'Collaborateur_Refus.prénom',
            ],
            filters: {
              logicalOperator: 'ET',
              conditions: [
                { attributePath: 'statut', operator: 'equals', value: 'refusé' },
                { attributePath: 'date début', operator: 'greaterThan', value: 'dateDuJour' },
              ],
            },
          },
        ],
      },
      {
        id: 'solde-conges',
        name: 'Solde de congés',
        cardinality: '0..n <> 1 Collaborateur',
        applicationDate: true,
        isApplicable: true,
        attributes: [
          { id: 'type-compte-solde', name: 'type compte', type: 'string', magicSel: true },
          { id: 'solde', name: 'solde', type: 'number', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur', '1', true)],
      },
    ],
  },
  {
    id: 'depenses',
    name: 'Les dépenses',
    objects: [
      {
        id: 'depenses-validees',
        name: 'Dépenses validées',
        cardinality: '0..n <> 1 Collaborateur de la dépense, 0..n <> 1 Collaborateur approbation',
        attributes: [
          { id: 'date-depense-validee', name: 'date dépense', type: 'date', magicSel: true },
          { id: 'date-approbation-depense', name: 'date approbation', type: 'date', magicSel: true },
          { id: 'nature-depense-validee', name: 'nature de dépense', type: 'string', magicSel: true },
          { id: 'devise-validee', name: 'devise', type: 'string', magicSel: true },
          { id: 'montant-ht-validee', name: 'montant HT', type: 'number' },
          { id: 'montant-ttc-validee', name: 'montant TTC', type: 'number', magicSel: true },
        ],
        relations: [
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur de la dépense', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur approbation'),
        ],
      },
      {
        id: 'depenses-refusees',
        name: 'Dépenses refusées',
        cardinality: '0..n <> 1 Collaborateur de la dépense, 0..n <> 1 Collaborateur refus',
        attributes: [
          { id: 'date-depense-refusee', name: 'date dépense', type: 'date', magicSel: true },
          { id: 'date-refus-depense', name: 'date refus', type: 'date', magicSel: true },
          { id: 'motif-refus-depense', name: 'motif de refus', type: 'string', magicSel: true },
          { id: 'nature-depense-refusee', name: 'nature de dépense', type: 'string', magicSel: true },
          { id: 'devise-refusee', name: 'devise', type: 'string', magicSel: true },
          { id: 'montant-ht-refusee', name: 'montant HT', type: 'number' },
          { id: 'montant-ttc-refusee', name: 'montant TTC', type: 'number', magicSel: true },
        ],
        relations: [
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur de la dépense', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur refus'),
        ],
      },
      {
        id: 'depenses-mod-alt',
        name: 'Dépenses',
        cardinality: '0..n <> 1 Collaborateur de la dépense, 0..n <> 1 Collaborateur refus, 0..n <> 1 Collaborateur approbation',
        attributes: [
          { id: 'statut-depense-mod-alt', name: 'statut', type: 'string', magicSel: true },
          { id: 'date-depense-mod-alt', name: 'date dépense', type: 'date', magicSel: true },
          { id: 'date-refus-mod-alt', name: 'date refus', type: 'date', magicSel: true },
          { id: 'motif-refus-mod-alt', name: 'motif de refus', type: 'string', magicSel: true },
          { id: 'date-approbation-mod-alt', name: 'date approbation', type: 'date', magicSel: true },
          { id: 'nature-depense-mod-alt', name: 'nature de dépense', type: 'string', magicSel: true },
          { id: 'devise-mod-alt', name: 'devise', type: 'string', magicSel: true },
          { id: 'montant-ht-mod-alt', name: 'montant HT', type: 'number' },
          { id: 'montant-ttc-mod-alt', name: 'montant TTC', type: 'number', magicSel: true },
        ],
        relations: [
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur de la dépense', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur refus'),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur approbation'),
        ],
      },
    ],
  },
  {
    id: 'entretiens',
    name: 'Les entretiens',
    objects: [
      {
        id: 'entretiens',
        name: 'Entretiens',
        cardinality: '0..n <> 1 Collaborateur concerné, 0..n <> 1 Collaborateur manager',
        attributes: [
          { id: 'type-entretien', name: "type d'entretien", type: 'string', magicSel: true },
          { id: 'date-preparation-collaborateur', name: 'date de préparation collaborateur', type: 'date' },
          { id: 'date-preparation-manager', name: 'date de préparation manager', type: 'date' },
          { id: 'date-validation-collaborateur', name: 'date de validation collaborateur', type: 'date' },
          { id: 'date-validation-manager', name: 'date de validation manager', type: 'date', magicSel: true },
          { id: 'commentaire-final', name: 'commentaire final', type: 'string', magicSel: true },
        ],
        relations: [
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur concerné', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur manager'),
        ],
      },
    ],
  },
  {
    id: 'formations',
    name: 'Les formations',
    objects: [
      {
        id: 'formations-refusees',
        name: 'Formations refusées',
        cardinality: '0..n <> 1 Collaborateur formé, 0..n <> 1 Collaborateur demande, 0..n <> 1 Collaborateur refus',
        attributes: [
          { id: 'date-demande-formation-refusee', name: 'date demande', type: 'date', magicSel: true },
          { id: 'date-refus-formation', name: 'date refus', type: 'date', magicSel: true },
        ],
        relations: [
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur formé', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur demande'),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur refus'),
        ],
      },
      {
        id: 'formations-suivies',
        name: 'Formations suivies',
        cardinality: '0..n <> 1 Catalogue de formation, 0..n <> 1 Collaborateur formé, 0..n <> 1 Collaborateur demande, 0..n <> 1 Collaborateur approbation',
        attributes: [
          { id: 'date-demande-formation-suivie', name: 'date demande', type: 'date' },
          { id: 'date-approbation-formation', name: 'date approbation', type: 'date' },
          { id: 'date-debut-formation', name: 'date de début', type: 'date', magicSel: true },
          { id: 'date-fin-formation', name: 'date de fin', type: 'date', magicSel: true },
          { id: 'date-certification', name: 'date certification', type: 'date' },
          { id: 'date-expiration-certification', name: 'date expiration', type: 'date' },
        ],
        relations: [
          rel('formations', 'catalogue-formation', 'Catalogue de formation', 'Catalogue de formation', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur formé', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur demande'),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur approbation'),
        ],
      },
      {
        id: 'catalogue-formation',
        name: 'Catalogue de formation',
        cardinality: '1',
        attributes: [
          { id: 'nom-formation', name: 'nom', type: 'string', magicSel: true },
          { id: 'description-formation', name: 'description', type: 'string' },
          { id: 'organisme-formation', name: 'organisme', type: 'string' },
          { id: 'obligatoire', name: 'obligatoire', type: 'boolean', magicSel: true },
        ],
      },
    ],
  },
  {
    id: 'objectifs',
    name: 'Les objectifs',
    objects: [
      {
        id: 'objectifs',
        name: 'Objectifs',
        cardinality: '0..n <> 1 Collaborateur concerné, 0..n <> 1 Collaborateur manager',
        attributes: [
          { id: 'description-objectif', name: 'description', type: 'string', magicSel: true },
          { id: 'date-debut-objectif', name: 'date début', type: 'date', magicSel: true },
          { id: 'date-fin-objectif', name: 'date fin', type: 'date', magicSel: true },
        ],
        relations: [
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur concerné', '1', true),
          rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur manager'),
        ],
      },
    ],
  },
  {
    id: 'remunerations',
    name: 'Les rémunérations',
    objects: [
      {
        id: 'remuneration-theorique-fixe',
        name: 'Rémunération théorique fixe',
        cardinality: '0..n <> 1 Collaborateur',
        attributes: [
          { id: 'date-debut-rem-fixe', name: 'date début', type: 'date', magicSel: true },
          { id: 'date-fin-rem-fixe', name: 'date fin', type: 'date', magicSel: true },
          { id: 'montant-fixe', name: 'montant', type: 'number', magicSel: true },
          { id: 'periodicite-fixe', name: 'périodicité', type: 'string', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur', '1', true)],
      },
      {
        id: 'remuneration-theorique-variable',
        name: 'Rémunération théorique variable',
        cardinality: '0..n <> 1 Collaborateur',
        attributes: [
          { id: 'date-debut-rem-variable', name: 'date début', type: 'date', magicSel: true },
          { id: 'date-fin-rem-variable', name: 'date fin', type: 'date', magicSel: true },
          { id: 'montant-variable', name: 'montant', type: 'number', magicSel: true },
          { id: 'periodicite-variable', name: 'périodicité', type: 'string', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur', '1', true)],
      },
      {
        id: 'remuneration-reelle',
        name: 'Rémunération réelle',
        cardinality: '0..n <> 1 Collaborateur',
        attributes: [
          { id: 'type-remuneration', name: 'type de rémunération', type: 'string', magicSel: true },
          { id: 'date-debut-rem-reelle', name: 'date début', type: 'date', magicSel: true },
          { id: 'date-fin-rem-reelle', name: 'date fin', type: 'date', magicSel: true },
          { id: 'montant-reelle', name: 'montant', type: 'number', magicSel: true },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur', '1', true)],
      },
    ],
  },
  {
    id: 'documents-partages',
    name: 'Les documents partagés',
    objects: [
      {
        id: 'documents-partages',
        name: 'Documents partagés',
        cardinality: '0..n <> 1 Département, 0..n <> 1 Etablissement',
        attributes: [
          { id: 'date-publication', name: 'date publication', type: 'date', magicSel: true },
          { id: 'document-partage', name: 'document', type: 'document' },
          { id: 'nom-document', name: 'nom du document', type: 'string', magicSel: true },
        ],
        relations: [
          rel('referentiels', 'departement', 'Département', 'Département', '1', true),
          rel('referentiels', 'etablissement', 'Etablissement', 'Etablissement', '1', true),
        ],
      },
    ],
  },
  {
    id: 'enquete-engagement',
    name: 'Les enquête engagement',
    objects: [
      {
        id: 'enquete-engagement',
        name: 'Enquête engagement',
        cardinality: '0..n <> 1 Département, 0..n <> 1 Etablissement',
        attributes: [
          { id: 'date-enquete', name: 'date enquête', type: 'date', magicSel: true },
          { id: 'titre-enquete', name: 'titre enquête', type: 'string', magicSel: true },
          { id: 'nombre-interroges', name: 'nombre interrogés', type: 'number' },
          { id: 'nombre-repondants', name: 'nombre répondants', type: 'number' },
          { id: 'score-moyen', name: 'score moyen', type: 'number', magicSel: true },
        ],
        relations: [
          rel('referentiels', 'departement', 'Département', 'Département', '1', true),
          rel('referentiels', 'etablissement', 'Etablissement', 'Etablissement', '1', true),
        ],
      },
    ],
  },
  {
    id: 'facture',
    name: 'Les factures',
    objects: [
      {
        id: 'factures',
        name: 'Factures',
        cardinality: '1',
        attributes: [
          { id: 'date-facture', name: 'date facture', type: 'date', magicSel: true },
          { id: 'date-reception', name: 'date réception', type: 'date' },
          { id: 'date-reglement', name: 'date règlement', type: 'date' },
          { id: 'statut-facture', name: 'statut', type: 'string', magicSel: true },
          { id: 'devise-facture', name: 'devise', type: 'string', magicSel: true },
          { id: 'montant-ht-facture', name: 'montant HT', type: 'number' },
          { id: 'montant-ttc-facture', name: 'montant TTC', type: 'number', magicSel: true },
        ],
      },
    ],
  },
  {
    id: 'recrutement',
    name: 'Le Recrutement',
    objects: [
      {
        id: 'postes-a-pourvoir',
        name: 'Postes à pourvoir',
        cardinality: '0..n <> 1 Département, 0..n <> 1 Etablissement',
        attributes: [
          { id: 'intitule-poste-pourvoir', name: 'Intitulé', type: 'string', magicSel: true },
          { id: 'date-ouverture-poste', name: 'Date ouverture poste', type: 'date', magicSel: true },
          { id: 'date-fermeture-poste', name: 'Date fermeture poste', type: 'date' },
        ],
        relations: [
          rel('referentiels', 'departement', 'Département', 'Département', '1', true),
          rel('referentiels', 'etablissement', 'Etablissement', 'Etablissement', '1', true),
        ],
      },
      {
        id: 'candidats',
        name: 'Candidats',
        cardinality: '1 <> 1..n Candidatures',
        attributes: [
          { id: 'nom-candidat', name: 'nom', type: 'string' },
          { id: 'prenom-candidat', name: 'prénom', type: 'string' },
        ],
        relations: [rel('recrutement', 'candidature', 'Candidature', 'Candidatures', '1..n')],
      },
      {
        id: 'candidature',
        name: 'Candidature',
        cardinality: '0..n <> 1..n Postes à pourvoir, 1 <> 1..n Historique de Candidature',
        attributes: [
          { id: 'date-candidature', name: 'date candidature', type: 'date', magicSel: true },
          { id: 'statut-candidature', name: 'statut candidature', type: 'string', magicSel: true },
        ],
        relations: [
          rel('recrutement', 'postes-a-pourvoir', 'Postes à pourvoir', 'Postes à pourvoir', '1..n', true),
          rel('recrutement', 'historique-candidature', 'Historique de Candidature', 'Historique de Candidature', '1..n'),
        ],
      },
      {
        id: 'historique-candidature',
        name: 'Historique de Candidature',
        cardinality: '0..n <> 1 Collaborateur recruteur',
        attributes: [
          { id: 'statut-historique', name: 'statut', type: 'string' },
          { id: 'commentaire-historique', name: 'commentaire', type: 'string' },
        ],
        relations: [rel('collaborateurs', 'collaborateur', 'Collaborateur', 'Collaborateur recruteur')],
      },
      {
        id: 'entretiens-recrutement',
        name: 'Entretiens',
        cardinality: '0..n <> 1 Candidature',
        attributes: [
          { id: 'date-entretien-recrutement', name: 'date entretien', type: 'date', magicSel: true },
          { id: 'type-entretien-recrutement', name: "type d'entretien", type: 'string', magicSel: true },
          { id: 'score-entretien', name: 'score', type: 'number', magicSel: true },
          { id: 'synthese-entretien', name: 'synthèse', type: 'string' },
        ],
        relations: [rel('recrutement', 'candidature', 'Candidature', 'Candidature')],
      },
    ],
  },
  {
    id: 'referentiels',
    name: 'Référentiels',
    objects: [
      {
        id: 'departement',
        name: 'Département',
        cardinality: '1',
        attributes: [
          { id: 'nom-departement', name: 'Nom', type: 'string', magicSel: true },
          { id: 'code-departement', name: 'Code', type: 'string' },
        ],
      },
      {
        id: 'etablissement',
        name: 'Etablissement',
        cardinality: '0..n <> 1 Organisation',
        attributes: [
          { id: 'nom-etablissement', name: 'Nom', type: 'string', magicSel: true },
          { id: 'code-etablissement', name: 'Code', type: 'string' },
        ],
        relations: [rel('referentiels', 'organisation', 'Organisation', 'Organisation')],
      },
      {
        id: 'organisation',
        name: 'Organisation',
        cardinality: '1',
        attributes: [
          { id: 'nom-organisation', name: 'Nom', type: 'string', magicSel: true },
          { id: 'code-organisation', name: 'Code', type: 'string' },
          { id: 'pays-organisation', name: 'Pays', type: 'string' },
        ],
      },
    ],
  },
];
