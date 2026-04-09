import { AttributeType, ApplicationDateConfig } from '../data/dataStructure';

export type AggregationType = 'CONCAT' | 'COUNT' | 'SUM' | 'MIN' | 'MAX' | 'AVG';
export type InsertionType = 'normal' | 'first' | 'last' | 'aggregation' | 'applicable' | 'conditional' | 'calculated';

export interface FilterCondition {
  attributeId: string; // ID de l'attribut filtré (pour permettre le filtrage sur d'autres attributs en cas d'agrégation)
  attributeName: string; // Nom de l'attribut filtré
  attributeType: AttributeType; // Type de l'attribut filtré
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty' | 'in';
  value: string | number | boolean | string[];
  valueType?: 'fixed' | 'attribute'; // Type de valeur : fixe ou référence à un attribut
  referenceAttributeId?: string; // ID de l'attribut référencé (si valueType === 'attribute')
  referenceAttributeName?: string; // Nom de l'attribut référencé (pour affichage)
  targetKind?: 'native' | 'compartment';
  compartmentSourceAttributeId?: string;
  compartmentSourceAttributeName?: string;
}

export interface FilterGroup {
  conditions: FilterCondition[];
  logicalOperator: 'ET' | 'OU';
}

export interface Compartment {
  name: string; // Nom de la tranche/catégorie (ex: "Tranche A", "Fonction Support")
  conditions: FilterCondition[]; // Conditions pour cette tranche
  logicalOperator: 'ET' | 'OU';
}

export interface CompartmentConfig {
  compartments: Compartment[];
}

export interface ConditionalExpression {
  leftAttributeId: string; // ID de la colonne à gauche
  leftAttributeName: string; // Nom de la colonne à gauche
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'isEmpty' | 'isNotEmpty';
  rightAttributeId?: string; // ID de la colonne à droite (optionnel si comparaison avec valeur fixe)
  rightAttributeName?: string; // Nom de la colonne à droite
  rightValue?: string | number | boolean; // Valeur fixe (optionnel si comparaison avec colonne)
  comparisonType: 'attribute' | 'value'; // Type de comparaison
}

export interface ConditionalGroup {
  expressions: ConditionalExpression[];
  logicalOperator: 'ET' | 'OU';
}

export interface ConditionalColumnConfig {
  name: string; // Nom de la colonne conditionnelle
  groups: ConditionalGroup[]; // Groupes de conditions (combinés par OU)
}

export type CalculatedOperator = 
  | 'add' | 'subtract' | 'multiply' | 'divide' // Opérations numériques
  | 'and' | 'or' | 'not' // Opérations booléennes
  | 'date_diff'; // Différence de dates en jours

export interface CalculatedOperand {
  type: 'column' | 'value';
  columnId?: string; // ID de la colonne
  columnName?: string; // Nom de la colonne
  columnType?: AttributeType; // Type de la colonne
  value?: string | number | boolean; // Valeur fixe
}

export interface CalculatedColumnConfig {
  name: string; // Nom de la colonne calculée
  resultType: 'number' | 'boolean'; // Type du résultat (date_diff retourne un nombre)
  leftOperand: CalculatedOperand;
  operator: CalculatedOperator;
  rightOperand?: CalculatedOperand; // Optionnel pour l'opérateur NOT
}

export interface DateReference {
  type: 'today' | 'custom' | 'attribute';
  customDate?: string;
  attributeId?: string;
}

export interface SelectedAttribute {
  id: string;
  attributeId: string;
  attributeName: string;
  attributeType: AttributeType;
  objectId: string;
  objectName: string;
  themeId: string;
  themeName: string;
  navigationPath?: Array<{
    objectName: string;
    cardinalityName?: string;
    relationLabel?: string;
    sourceObjectName?: string;
  }>; // Chemin de navigation complet
  insertionType: InsertionType;
  sortAttributeId?: string; // Pour first/last
  sortDirection?: 'asc' | 'desc'; // Pour first/last
  aggregationType?: AggregationType; // Pour aggregation
  filterGroups?: FilterGroup[]; // Groupes de filtres (combinés par ET entre les groupes)
  compartmentConfig?: CompartmentConfig; // Configuration des compartiments/tranches
  dateReference?: DateReference; // Pour objets applicables
  applicationDateConfig?: ApplicationDateConfig; // Définition des attributs de début/fin de validité
  isApplicable?: boolean;
  columnName?: string; // Nom personnalisé de la colonne
  conditionalConfig?: ConditionalColumnConfig; // Pour les colonnes conditionnelles
  calculatedConfig?: CalculatedColumnConfig; // Pour les colonnes calculées
  ownObjectOnly?: boolean;
  insertionLotId?: string;
  insertionLotLabel?: string;
  insertionLotDateMode?: 'today' | 'reportStart' | 'reportEnd' | 'reportColumn';
  insertionLotDateColumnId?: string;
  insertionLotDateLabel?: string;
}