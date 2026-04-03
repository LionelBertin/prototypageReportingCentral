import manifest from '../../../listeDomainesManifest.json';

export type AttributeType = 'string' | 'number' | 'date' | 'boolean' | 'document';

export interface Attribute {
  id: string;
  name: string;
  type: AttributeType;
  required?: boolean;
  magicSel?: boolean;
  description?: string;
}

export interface ObjectRelation {
  targetObjectId: string;
  targetThemeId: string;
  targetObjectName: string;
  cardinality: string;
  cardinalityFrom?: string;
  label: string;
  magicSel?: boolean;
  recursiveMagicSel?: boolean;
  description?: string;
}

export type SmartObjectFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'contains'
  | 'isEmpty'
  | 'isNotEmpty';

export interface SmartObjectFilterCondition {
  attributePath: string;
  operator: SmartObjectFilterOperator;
  value: string | number | boolean | 'dateDuJour';
}

export interface SmartObjectFilterGroupDefinition {
  logicalOperator: 'ET' | 'OU';
  conditions: SmartObjectFilterCondition[];
}

export interface ApplicationDateConfig {
  startAttributeId?: string;
  endAttributeId?: string;
  mandatory?: boolean;
  resultingSingleLine?: boolean;
}

export interface SmartObjectDefinition {
  title: string;
  columns: string[];
  filters?: {
    groups: SmartObjectFilterGroupDefinition[];
  };
}

export interface DataObject {
  id: string;
  name: string;
  cardinality: string;
  attributes: Attribute[];
  applicationDate?: boolean;
  applicationDateConfig?: ApplicationDateConfig;
  isApplicable?: boolean;
  relations?: ObjectRelation[];
  smartObjects?: SmartObjectDefinition[];
  description?: string;
}

export interface Theme {
  id: string;
  name: string;
  objects: DataObject[];
  description?: string;
}

type ManifestAttribute = {
  id: string;
  name: string;
  dataType?: 'numeric' | 'number' | 'date' | 'string' | 'file' | 'booleen' | 'email' | 'phone';
  type?: AttributeType;
  magicSel?: boolean;
  description?: string;
};

type ManifestRelation = {
  targetObject?: string;
  relationName?: string;
  cardinalityFrom?: string;
  cardinalityTo?: string;
  recursiveMagicSel?: boolean;
  magicSel?: boolean;
  description?: string;
};

type ManifestObject = {
  id: string;
  name: string;
  cardinality?: string;
  applicationDate?: boolean | { startAttributeId?: string; endAttributeId?: string; mandatory?: boolean; resultingSingleLine?: boolean };
  isApplicable?: boolean;
  description?: string;
  attributes?: ManifestAttribute[];
  relations?: ManifestRelation[];
  smartObjects?: Array<{
    title?: string;
    columns?: unknown;
    filters?: unknown;
  }>;
};

type ManifestDomain = {
  id: string;
  name: string;
  description?: string;
  objects?: ManifestObject[];
};

const typedManifest = manifest as {
  domains?: ManifestDomain[];
};

const numberHints = ['montant', 'age', 'nombre', 'score', 'solde', 'duree', 'durée', 'taille'];

const inferAttributeType = (name: string): AttributeType => {
  const lowered = name.toLowerCase();
  if (lowered.includes('date')) return 'date';
  if (lowered.includes('document') || lowered.includes('photo')) return 'document';
  if (lowered.includes('obligatoire') || lowered.startsWith('is ')) return 'boolean';
  if (numberHints.some((hint) => lowered.includes(hint))) return 'number';
  return 'string';
};

const normalizeAttributeType = (attribute: ManifestAttribute): AttributeType => {
  if (attribute.dataType) {
    const normalizeddataType = attribute.dataType.toLowerCase();
    if (normalizeddataType === 'numeric' || normalizeddataType === 'number') return 'number';
    if (normalizeddataType === 'date') return 'date';
    if (normalizeddataType === 'string') return 'string';
    if (normalizeddataType === 'file') return 'document';
    if (normalizeddataType === 'booleen') return 'boolean';
    if (normalizeddataType === 'email' || normalizeddataType === 'phone') return 'string';
  }

  if (attribute.type) return attribute.type;
  return inferAttributeType(attribute.name);
};

const normalizeCardinality = (value?: string): string => {
  if (!value || !value.trim()) return '1';
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'one') return '1';
  if (trimmed === 'many') return 'n';
  return trimmed;
};

const buildFallbackCardinality = (obj: ManifestObject): string => {
  if (!obj.relations || obj.relations.length === 0) return '1';
  return obj.relations
    .map((relation) => {
      const from = normalizeCardinality(relation.cardinalityFrom);
      const to = normalizeCardinality(relation.cardinalityTo);
      const target = relation.relationName || relation.targetObject || 'Objet';
      return `${from} <> ${to} ${target}`;
    })
    .join(', ');
};

const buildObjectLookup = (domains: ManifestDomain[]) => {
  const byKey = new Map<string, { themeId: string; objectId: string; objectName: string }>();
  const byName = new Map<string, Array<{ themeId: string; objectId: string; objectName: string }>>();

  for (const domain of domains) {
    for (const obj of domain.objects ?? []) {
      const entry = { themeId: domain.id, objectId: obj.id, objectName: obj.name };
      byKey.set(`${domain.id}::${obj.id}`, entry);
      const key = obj.name.trim().toLowerCase();
      const list = byName.get(key) ?? [];
      list.push(entry);
      byName.set(key, list);
    }
  }

  return { byKey, byName };
};

const resolveRelationTarget = (
  relation: ManifestRelation,
  domainId: string,
  objectLookup: ReturnType<typeof buildObjectLookup>
) => {
  const targetName = relation.targetObject?.trim();
  if (!targetName) return null;

  const candidates = objectLookup.byName.get(targetName.toLowerCase()) ?? [];
  if (candidates.length === 0) return null;

  const inSameDomain = candidates.find((candidate) => candidate.themeId === domainId);
  return inSameDomain ?? candidates[0];
};

const normalizeFilterOperator = (operator: string): SmartObjectFilterOperator | null => {
  const cleaned = operator.trim().toLowerCase();
  switch (cleaned) {
    case '=':
    case '==':
    case 'equals':
      return 'equals';
    case '!=':
    case '<>':
    case 'notequals':
      return 'notEquals';
    case '>':
    case 'greaterthan':
      return 'greaterThan';
    case '<':
    case 'lessthan':
      return 'lessThan';
    case '>=':
    case 'greaterorequal':
      return 'greaterOrEqual';
    case '<=':
    case 'lessorequal':
      return 'lessOrEqual';
    case 'contains':
      return 'contains';
    case 'isempty':
      return 'isEmpty';
    case 'isnotempty':
      return 'isNotEmpty';
    default:
      return null;
  }
};

const stripOuterParens = (value: string): string => {
  let current = value.trim();
  while (current.startsWith('(') && current.endsWith(')')) {
    let depth = 0;
    let balanced = true;

    for (let index = 0; index < current.length; index += 1) {
      const char = current[index];
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (depth === 0 && index < current.length - 1) {
        balanced = false;
        break;
      }
      if (depth < 0) {
        balanced = false;
        break;
      }
    }

    if (!balanced || depth !== 0) break;
    current = current.slice(1, -1).trim();
  }
  return current;
};

const splitTopLevelByKeyword = (expression: string, keyword: 'and' | 'or'): string[] => {
  const result: string[] = [];
  const normalized = expression.trim();
  if (!normalized) return result;

  const upperKeyword = ` ${keyword.toUpperCase()} `;
  const lowerKeyword = ` ${keyword.toLowerCase()} `;

  let depth = 0;
  let quote: "'" | '"' | null = null;
  let tokenStart = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (quote) {
      if (char === quote) quote = null;
      continue;
    }

    if (char === '\'' || char === '"') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth !== 0) continue;

    const remainingUpper = normalized.slice(index, index + upperKeyword.length).toUpperCase();
    const remainingLower = normalized.slice(index, index + lowerKeyword.length).toLowerCase();
    if (remainingUpper === upperKeyword || remainingLower === lowerKeyword) {
      const token = normalized.slice(tokenStart, index).trim();
      if (token) result.push(token);
      tokenStart = index + upperKeyword.length;
      index = tokenStart - 1;
    }
  }

  const lastToken = normalized.slice(tokenStart).trim();
  if (lastToken) result.push(lastToken);

  return result;
};

const parseSingleFilterCondition = (rawCondition: string): SmartObjectFilterCondition | null => {
  const cleaned = stripOuterParens(rawCondition).trim();
  if (!cleaned) return null;

  const notNullMatch = cleaned.match(/^(.*?)\s+is\s+not\s+null$/i);
  if (notNullMatch) {
    const attributePath = stripOuterParens(notNullMatch[1]).trim().replace(/^['"]|['"]$/g, '');
    if (!attributePath) return null;
    return {
      attributePath,
      operator: 'isNotEmpty',
      value: '',
    };
  }

  const nullMatch = cleaned.match(/^(.*?)\s+is\s+null$/i);
  if (nullMatch) {
    const attributePath = stripOuterParens(nullMatch[1]).trim().replace(/^['"]|['"]$/g, '');
    if (!attributePath) return null;
    return {
      attributePath,
      operator: 'isEmpty',
      value: '',
    };
  }

  const match = cleaned.match(/^(.*?)\s*(<=|>=|!=|=|<|>|contains)\s*(.*?)$/i);
  if (!match) return null;

  const [, rawPath, rawOperator, rawValue] = match;
  const operator = normalizeFilterOperator(rawOperator);
  if (!operator) return null;

  const attributePath = stripOuterParens(rawPath).trim().replace(/^['"]|['"]$/g, '');
  if (!attributePath) return null;

  return {
    attributePath,
    operator,
    value: parseFilterValue(rawValue),
  };
};

const parseFilterValue = (rawValue: string): string | number | boolean | 'dateDuJour' => {
  const trimmed = rawValue.trim();
  if (/^dateDuJour$/i.test(trimmed)) return 'dateDuJour';

  const unquoted =
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
    || (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ? trimmed.slice(1, -1)
      : trimmed;

  if (/^(true|false)$/i.test(unquoted)) {
    return /^true$/i.test(unquoted);
  }

  const asNumber = Number(unquoted);
  if (!Number.isNaN(asNumber) && unquoted !== '') {
    return asNumber;
  }

  return unquoted;
};

const parseFilterExpression = (expression: string): SmartObjectDefinition['filters'] | undefined => {
  // Convert expression to DNF: OR of groups, each group is an AND of conditions.
  const buildDnf = (rawExpression: string): SmartObjectFilterCondition[][] => {
    const normalized = stripOuterParens(rawExpression.trim());
    if (!normalized) return [];

    const orParts = splitTopLevelByKeyword(normalized, 'or');
    if (orParts.length > 1) {
      return orParts.flatMap((part) => buildDnf(part));
    }

    const andParts = splitTopLevelByKeyword(normalized, 'and');
    if (andParts.length > 1) {
      let accumulator: SmartObjectFilterCondition[][] = [[]];

      for (const andPart of andParts) {
        const partDnf = buildDnf(andPart);
        if (partDnf.length === 0) return [];

        const combined: SmartObjectFilterCondition[][] = [];
        for (const baseGroup of accumulator) {
          for (const partGroup of partDnf) {
            combined.push([...baseGroup, ...partGroup]);
          }
        }
        accumulator = combined;
      }

      return accumulator;
    }

    const single = parseSingleFilterCondition(normalized);
    return single ? [[single]] : [];
  };

  const dnfGroups = buildDnf(expression);

  const groups = dnfGroups
    .filter((conditions) => conditions.length > 0)
    .map((conditions) => ({
      logicalOperator: (conditions.length > 1 ? 'ET' : 'OU') as 'ET' | 'OU',
      conditions,
    }));

  if (groups.length === 0) return undefined;

  return { groups };
};

const normalizeSmartFilter = (value: unknown): SmartObjectDefinition['filters'] | undefined => {
  if (!value) return undefined;

  if (typeof value === 'string') {
    return parseFilterExpression(value);
  }

  if (typeof value !== 'object') return undefined;

  const raw = value as {
    logicalOperator?: unknown;
    conditions?: unknown;
    groups?: unknown;
  };

  if (Array.isArray(raw.groups) && raw.groups.length > 0) {
    const groups = raw.groups
      .map((groupItem) => {
        if (!groupItem || typeof groupItem !== 'object') return null;
        const group = groupItem as {
          logicalOperator?: unknown;
          conditions?: unknown;
        };

        if (!Array.isArray(group.conditions) || group.conditions.length === 0) return null;

        const logicalOperator: 'ET' | 'OU' = String(group.logicalOperator).toUpperCase() === 'OU' ? 'OU' : 'ET';

        const conditions = group.conditions
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const candidate = item as {
              attributePath?: unknown;
              operator?: unknown;
              value?: unknown;
            };

            if (typeof candidate.attributePath !== 'string' || typeof candidate.operator !== 'string') {
              return null;
            }

            const operator = normalizeFilterOperator(candidate.operator);
            if (!operator) return null;

            let valueResult: string | number | boolean | 'dateDuJour' = '';
            if (candidate.value === 'dateDuJour') {
              valueResult = 'dateDuJour';
            } else if (
              typeof candidate.value === 'string'
              || typeof candidate.value === 'number'
              || typeof candidate.value === 'boolean'
            ) {
              valueResult = candidate.value as string | number | boolean;
            } else {
              valueResult = String(candidate.value ?? '');
            }

            return {
              attributePath: candidate.attributePath,
              operator,
              value: valueResult,
            };
          })
          .filter((condition): condition is SmartObjectFilterCondition => condition !== null);

        if (conditions.length === 0) return null;

        return {
          logicalOperator,
          conditions,
        };
      })
      .filter((group): group is SmartObjectFilterGroupDefinition => group !== null);

    return groups.length > 0 ? { groups } : undefined;
  }

  if (!Array.isArray(raw.conditions) || raw.conditions.length === 0) return undefined;

  const logicalOperator: 'ET' | 'OU' = String(raw.logicalOperator).toUpperCase() === 'OU' ? 'OU' : 'ET';

  const conditions = raw.conditions
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as {
        attributePath?: unknown;
        operator?: unknown;
        value?: unknown;
      };

      if (typeof candidate.attributePath !== 'string' || typeof candidate.operator !== 'string') {
        return null;
      }

      const operator = normalizeFilterOperator(candidate.operator);
      if (!operator) return null;

      let valueResult: string | number | boolean | 'dateDuJour' = '';
      if (candidate.value === 'dateDuJour') {
        valueResult = 'dateDuJour';
      } else if (
        typeof candidate.value === 'string'
        || typeof candidate.value === 'number'
        || typeof candidate.value === 'boolean'
      ) {
        valueResult = candidate.value as string | number | boolean;
      } else {
        valueResult = String(candidate.value ?? '');
      }

      return {
        attributePath: candidate.attributePath,
        operator,
        value: valueResult,
      };
    })
    .filter((condition): condition is SmartObjectFilterCondition => condition !== null);

  if (conditions.length === 0) return undefined;

  return {
    groups: [
      {
        logicalOperator,
        conditions,
      },
    ],
  };
};

const normalizeSmartObjects = (value: ManifestObject['smartObjects']): SmartObjectDefinition[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const valid = value
    .map((item) => {
      if (!item || typeof item.title !== 'string' || !Array.isArray(item.columns)) return null;

      const columns = item.columns
        .filter((column): column is string => typeof column === 'string' && !!column.trim())
        .map((column) => column.trim());

      if (columns.length === 0) return null;

      return {
        title: item.title,
        columns,
        filters: normalizeSmartFilter(item.filters),
      } as SmartObjectDefinition;
    })
    .filter((item): item is SmartObjectDefinition => item !== null);
  return valid.length > 0 ? valid : undefined;
};

const buildDataStructure = (): Theme[] => {
  const domains = typedManifest.domains ?? [];
  const objectLookup = buildObjectLookup(domains);

  return domains.map((domain) => ({
    id: domain.id,
    name: domain.name,
    description: domain.description,
    objects: (domain.objects ?? []).map((obj) => {
      const relations: ObjectRelation[] = (obj.relations ?? []).flatMap((relation) => {
        const target = resolveRelationTarget(relation, domain.id, objectLookup);
        if (!target) return [];

        return [{
          targetThemeId: target.themeId,
          targetObjectId: target.objectId,
          targetObjectName: target.objectName,
          label: relation.relationName || target.objectName,
          cardinality: normalizeCardinality(relation.cardinalityTo || relation.cardinalityFrom),
          cardinalityFrom: normalizeCardinality(relation.cardinalityFrom || relation.cardinalityTo),
          magicSel: !!relation.magicSel,
          recursiveMagicSel: !!relation.recursiveMagicSel,
          description: relation.description,
        }];
      });

      return {
        id: obj.id,
        name: obj.name,
        description: obj.description,
        cardinality: obj.cardinality || buildFallbackCardinality(obj),
        applicationDate: !!obj.applicationDate,
        applicationDateConfig: (typeof obj.applicationDate === 'object' && obj.applicationDate !== null)
          ? {
              startAttributeId: obj.applicationDate.startAttributeId,
              endAttributeId: obj.applicationDate.endAttributeId,
              mandatory: !!obj.applicationDate.mandatory,
              resultingSingleLine: !!obj.applicationDate.resultingSingleLine,
            }
          : (obj.applicationDate
            ? { mandatory: false, resultingSingleLine: false }
            : undefined),
        isApplicable: !!obj.isApplicable || !!obj.applicationDate,
        attributes: (obj.attributes ?? []).map((attribute) => ({
          id: attribute.id,
          name: attribute.name,
          type: normalizeAttributeType(attribute),
          magicSel: !!attribute.magicSel,
          description: attribute.description,
        })),
        relations: relations.length > 0 ? relations : undefined,
        smartObjects: normalizeSmartObjects(obj.smartObjects),
      } as DataObject;
    }),
  }));
};

export const dataStructure: Theme[] = buildDataStructure();

