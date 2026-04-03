import { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AttributeType, SmartObjectDefinition } from '../data/dataStructure';
import type { AggregationType, DateReference, FilterGroup, InsertionType } from '../types/selection';
import { InfoHint } from './InfoHint';

type ObjectInsertionMode = 'detailed' | 'operation' | 'aggregation' | 'special';

export interface ObjectInsertionConfig {
  insertionType: Extract<InsertionType, 'normal' | 'aggregation' | 'first' | 'last' | 'applicable'>;
  selectedAttributeIds?: string[];
  aggregationAttributeId?: string;
  aggregationType?: AggregationType;
  sortAttributeId?: string;
  sortDirection?: 'asc' | 'desc';
  dateReference?: DateReference;
  smartFilterGroups?: FilterGroup[];
  applyApplicableToday?: boolean;
}

interface ObjectInsertionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  objectName: string;
  cardinality: string;
  objectSupportsApplicable?: boolean;
  availableAttributes: Array<{
    id: string;
    name: string;
    rawName?: string;
    description?: string;
    type: AttributeType;
    magicSel?: boolean;
    smartSel?: boolean;
    sourceObjectName?: string;
    relativeNavigationPath?: Array<{ objectName: string; relationLabel?: string; sourceObjectName?: string }>;
  }>;
  smartObjects?: SmartObjectDefinition[];
  availableDateAttributes: Array<{ id: string; name: string }>;
  initialMode: ObjectInsertionMode;
  initialConfig?: Partial<ObjectInsertionConfig>;
  onConfirm: (config: ObjectInsertionConfig) => void;
}

type GroupedAttribute = {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: AttributeType;
  magicSel?: boolean;
  smartSel?: boolean;
  groupKey: string;
  groupName: string;
  groupPathTokens: string[];
};

type AttributeGroup = {
  key: string;
  name: string;
  pathTokens: string[];
  attributes: GroupedAttribute[];
};

const allAggregations: AggregationType[] = ['COUNT', 'CONCAT', 'SUM', 'MIN', 'MAX', 'AVG'];

const aggregationLabels: Record<AggregationType, string> = {
  COUNT: 'Nombre',
  CONCAT: 'Concaténation',
  SUM: 'Somme',
  MIN: 'Minimum',
  MAX: 'Maximum',
  AVG: 'Moyenne',
};

export function ObjectInsertionDialog({
  isOpen,
  onClose,
  objectName,
  cardinality,
  objectSupportsApplicable = false,
  availableAttributes,
  smartObjects = [],
  availableDateAttributes,
  initialMode,
  initialConfig,
  onConfirm,
}: ObjectInsertionDialogProps) {
  const mode: ObjectInsertionMode = initialMode;
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>(
    availableAttributes.filter((attr) => !!attr.smartSel).map((attr) => attr.id)
  );
  const [aggregationAttributeId, setAggregationAttributeId] = useState<string>('');
  const [aggregationType, setAggregationType] = useState<AggregationType>('COUNT');
  const [aggregationSortAttributeId, setAggregationSortAttributeId] = useState<string>('');
  const [aggregationSortDirection, setAggregationSortDirection] = useState<'asc' | 'desc'>('asc');
  const [specialType, setSpecialType] = useState<'first' | 'last' | 'applicable'>(
    objectSupportsApplicable && !cardinality.includes('n') ? 'applicable' : 'first'
  );
  const [operationType, setOperationType] = useState<'first' | 'last' | 'aggregation'>('last');
  const [sortAttributeId, setSortAttributeId] = useState<string>('');
  const [referenceType, setReferenceType] = useState<DateReference['type']>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [referenceAttributeId, setReferenceAttributeId] = useState<string>('');
  const [attributeSearchTerm, setAttributeSearchTerm] = useState<string>('');
  const [smartFilterGroups, setSmartFilterGroups] = useState<FilterGroup[] | undefined>(undefined);
  const [applyApplicableToday, setApplyApplicableToday] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const defaultSelected = availableAttributes.filter((attr) => !!attr.smartSel).map((attr) => attr.id);
    setSelectedAttributeIds(initialConfig?.selectedAttributeIds ?? defaultSelected);
    setAggregationAttributeId(initialConfig?.aggregationAttributeId ?? '');
    setAggregationType(initialConfig?.aggregationType ?? 'COUNT');
    setAggregationSortAttributeId(initialConfig?.sortAttributeId ?? '');
    setAggregationSortDirection(initialConfig?.sortDirection ?? 'asc');
    setSpecialType(
      (initialConfig?.insertionType as 'first' | 'last' | 'applicable' | undefined)
        ?? (objectSupportsApplicable && !cardinality.includes('n') ? 'applicable' : 'first')
    );
    setOperationType(
      initialConfig?.insertionType === 'aggregation'
        ? 'aggregation'
        : initialConfig?.insertionType === 'first'
        ? 'first'
        : initialConfig?.insertionType === 'last'
        ? 'last'
        : 'last'
    );
    setSortAttributeId(initialConfig?.sortAttributeId ?? '');
    setReferenceType(initialConfig?.dateReference?.type ?? 'today');
    setCustomDate(initialConfig?.dateReference?.customDate ?? '');
    setReferenceAttributeId(initialConfig?.dateReference?.attributeId ?? '');
    setAttributeSearchTerm('');
    setSmartFilterGroups(initialConfig?.smartFilterGroups);
    setApplyApplicableToday(!!initialConfig?.applyApplicableToday);
  }, [isOpen, availableAttributes, initialConfig, objectSupportsApplicable, cardinality]);

  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .replace(/\[applicable\]/g, ' applicable ')
      .replace(/[_.>]/g, ' ')
      .replace(/['’]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const getTokens = (value: string) => normalize(value).split(' ').filter(Boolean);

  const isTokenSubset = (needle: string, haystack: string) => {
    const needleTokens = getTokens(needle);
    const haystackTokens = new Set(getTokens(haystack));
    if (needleTokens.length === 0) return true;
    return needleTokens.every((token) => haystackTokens.has(token));
  };

  const todayAsIsoDate = () => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
  };

  const hasMultipleCardinality = cardinality.includes('n');

  const selectedAggregationAttribute = useMemo(
    () => availableAttributes.find((attr) => attr.id === aggregationAttributeId),
    [aggregationAttributeId, availableAttributes]
  );

  const availableAggregationTypes = useMemo(() => {
    if (!selectedAggregationAttribute) {
      return ['COUNT', 'CONCAT'] as AggregationType[];
    }

    if (selectedAggregationAttribute.type === 'number') {
      return ['COUNT', 'CONCAT', 'SUM', 'MIN', 'MAX', 'AVG'] as AggregationType[];
    }

    if (selectedAggregationAttribute.type === 'date') {
      return ['COUNT', 'CONCAT', 'MIN', 'MAX'] as AggregationType[];
    }

    return ['COUNT', 'CONCAT'] as AggregationType[];
  }, [selectedAggregationAttribute]);

  const normalizedAttributes = useMemo<GroupedAttribute[]>(() => {
    return availableAttributes.map((attr) => {
      const navTokens = (attr.relativeNavigationPath ?? [])
        .map((step) => step.objectName?.trim())
        .filter((value): value is string => !!value);
      const pathTokens = navTokens.length > 0 ? [objectName, ...navTokens] : [objectName];
      const groupName = pathTokens[pathTokens.length - 1] || objectName;

      return {
        id: attr.id,
        name: attr.name,
        displayName: attr.rawName?.trim() || attr.name,
        description: attr.description,
        type: attr.type,
        magicSel: attr.magicSel,
        smartSel: attr.smartSel,
        groupKey: pathTokens.join(' > '),
        groupName,
        groupPathTokens: pathTokens,
      };
    });
  }, [availableAttributes, objectName]);

  const groupedAttributesByKey = useMemo(() => {
    const groups = new Map<string, AttributeGroup>();

    for (const attr of normalizedAttributes) {
      const existing = groups.get(attr.groupKey);
      if (existing) {
        existing.attributes.push(attr);
        continue;
      }

      groups.set(attr.groupKey, {
        key: attr.groupKey,
        name: attr.groupName,
        pathTokens: attr.groupPathTokens,
        attributes: [attr],
      });
    }

    for (const group of groups.values()) {
      group.attributes.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }));
    }

    return groups;
  }, [normalizedAttributes]);

  const filteredAttributes = useMemo(() => {
    const normalizedSearch = attributeSearchTerm.trim().toLocaleLowerCase();
    return normalizedAttributes
      .filter((attr) => {
        if (!normalizedSearch) return true;
        return attr.displayName.toLocaleLowerCase().includes(normalizedSearch);
      })
      .sort((a, b) => {
        const groupCompare = a.groupName.localeCompare(b.groupName, 'fr', { sensitivity: 'base' });
        if (groupCompare !== 0) return groupCompare;
        return a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' });
      });
  }, [normalizedAttributes, attributeSearchTerm]);

  const groupedFilteredAttributes = useMemo<AttributeGroup[]>(() => {
    const groups = new Map<string, AttributeGroup>();

    for (const attr of filteredAttributes) {
      const existing = groups.get(attr.groupKey);
      if (existing) {
        existing.attributes.push(attr);
        continue;
      }

      groups.set(attr.groupKey, {
        key: attr.groupKey,
        name: attr.groupName,
        pathTokens: attr.groupPathTokens,
        attributes: [attr],
      });
    }

    const orderedGroups = Array.from(groups.values());
    orderedGroups.sort((a, b) => {
      const aIsRoot = a.pathTokens.length === 1 && a.pathTokens[0] === objectName;
      const bIsRoot = b.pathTokens.length === 1 && b.pathTokens[0] === objectName;

      if (aIsRoot && !bIsRoot) return -1;
      if (!aIsRoot && bIsRoot) return 1;

      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });

    for (const group of orderedGroups) {
      group.attributes.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }));
    }

    return orderedGroups;
  }, [filteredAttributes]);

  const matchSmartPathToAttribute = (
    attribute: ObjectInsertionDialogProps['availableAttributes'][number],
    columnPath: string
  ) => {
    const columnParts = columnPath
      .split('.')
      .map((part) => part.trim())
      .filter(Boolean);
    if (columnParts.length === 0) return false;

    const rawAttributeName = attribute.rawName ?? attribute.name;
    const requestedAttributeName = columnParts[columnParts.length - 1];
    if (!isTokenSubset(requestedAttributeName, rawAttributeName)) {
      return false;
    }

    const requestedPath = columnParts.slice(0, -1);
    if (requestedPath.length === 0) {
      return true;
    }

    const pathSteps = (attribute.relativeNavigationPath ?? []).map((step) =>
      [step.relationLabel, step.objectName].filter(Boolean).join(' ')
    );

    if (requestedPath.length > pathSteps.length) {
      return false;
    }

    return requestedPath.every((requestedPart, index) => {
      const pathStep = pathSteps[index];
      return isTokenSubset(requestedPart, pathStep);
    });
  };

  const resolveSmartColumnIds = (smartObject: SmartObjectDefinition) => {
    const selectedIds: string[] = [];

    for (const column of smartObject.columns) {
      const matched = availableAttributes.find((attribute) => matchSmartPathToAttribute(attribute, column));
      if (matched) {
        selectedIds.push(matched.id);
      }
    }

    return Array.from(new Set(selectedIds));
  };

  const resolveSmartFilterGroups = (smartObject: SmartObjectDefinition): FilterGroup[] | undefined => {
    if (!smartObject.filters || smartObject.filters.conditions.length === 0) {
      return undefined;
    }

    const conditions = smartObject.filters.conditions
      .map((condition) => {
        const matched = availableAttributes.find((attribute) => matchSmartPathToAttribute(attribute, condition.attributePath));
        if (!matched) {
          return null;
        }

        const rawValue = condition.value === 'dateDuJour' ? todayAsIsoDate() : condition.value;

        return {
          attributeId: matched.id,
          attributeName: matched.rawName ?? matched.name,
          attributeType: matched.type,
          operator: condition.operator,
          value: rawValue,
          valueType: 'fixed' as const,
        };
      })
      .filter((condition): condition is NonNullable<typeof condition> => condition !== null);

    if (conditions.length === 0) {
      return undefined;
    }

    return [{
      logicalOperator: smartObject.filters.logicalOperator,
      conditions,
    }];
  };

  const applySmartObject = (smartObject: SmartObjectDefinition) => {
    const resolvedAttributeIds = resolveSmartColumnIds(smartObject);
    setSelectedAttributeIds(resolvedAttributeIds);
    setSmartFilterGroups(resolveSmartFilterGroups(smartObject));
    setApplyApplicableToday(true);
  };

  if (!isOpen) return null;

  const toggleAttribute = (attributeId: string) => {
    setSelectedAttributeIds((prev) =>
      prev.includes(attributeId) ? prev.filter((id) => id !== attributeId) : [...prev, attributeId]
    );
  };

  const isPathSameOrDescendant = (candidatePath: string[], groupPath: string[]) => {
    if (candidatePath.length < groupPath.length) return false;
    for (let index = 0; index < groupPath.length; index += 1) {
      if (candidatePath[index] !== groupPath[index]) return false;
    }
    return true;
  };

  const selectGroupAllAttributes = (groupKey: string) => {
    const group = groupedAttributesByKey.get(groupKey);
    if (!group) return;

    const groupIds = group.attributes.map((attr) => attr.id);
    setSelectedAttributeIds((prev) => Array.from(new Set([...prev, ...groupIds])));
  };

  const clearGroupAttributes = (groupKey: string) => {
    const group = groupedAttributesByKey.get(groupKey);
    if (!group) return;

    const groupIds = new Set(group.attributes.map((attr) => attr.id));
    setSelectedAttributeIds((prev) => prev.filter((id) => !groupIds.has(id)));
  };

  const selectGroupSmartAttributesRecursively = (groupKey: string) => {
    const group = groupedAttributesByKey.get(groupKey);
    if (!group) return;

    const recursiveAttributes = normalizedAttributes.filter((attr) =>
      isPathSameOrDescendant(attr.groupPathTokens, group.pathTokens)
    );
    const recursiveIds = new Set(recursiveAttributes.map((attr) => attr.id));
    const recursiveSmartIds = recursiveAttributes
      .filter((attr) => !!attr.magicSel)
      .map((attr) => attr.id);

    setSelectedAttributeIds((prev) => {
      const outsideSelection = prev.filter((id) => !recursiveIds.has(id));
      return Array.from(new Set([...outsideSelection, ...recursiveSmartIds]));
    });
  };

  const handleConfirm = () => {
    if (mode === 'operation') {
      if (operationType === 'aggregation') {
        if (!aggregationAttributeId) {
          alert('Veuillez sélectionner un attribut à agréger');
          return;
        }

        if (aggregationType === 'CONCAT' && !aggregationSortAttributeId) {
          alert('Veuillez sélectionner un attribut de tri pour la concaténation');
          return;
        }

        onConfirm({
          insertionType: 'aggregation',
          aggregationAttributeId,
          aggregationType,
          sortAttributeId: aggregationType === 'CONCAT' ? aggregationSortAttributeId : undefined,
          sortDirection: aggregationType === 'CONCAT' ? aggregationSortDirection : undefined,
        });
        onClose();
        return;
      }

      if (selectedAttributeIds.length === 0) {
        alert('Veuillez sélectionner au moins un attribut');
        return;
      }

      if (hasMultipleCardinality && !sortAttributeId) {
        alert('Veuillez sélectionner un attribut de tri');
        return;
      }

      onConfirm({
        insertionType: operationType,
        selectedAttributeIds,
        sortAttributeId: hasMultipleCardinality ? sortAttributeId : undefined,
      });
      onClose();
      return;
    }

    if (mode === 'detailed') {
      if (selectedAttributeIds.length === 0) {
        alert('Veuillez sélectionner au moins un attribut');
        return;
      }

      onConfirm({
        insertionType: 'normal',
        selectedAttributeIds,
        smartFilterGroups,
        applyApplicableToday,
      });
      onClose();
      return;
    }

    if (mode === 'aggregation') {
      if (!aggregationAttributeId) {
        alert('Veuillez sélectionner un attribut à agréger');
        return;
      }

      if (aggregationType === 'CONCAT' && !aggregationSortAttributeId) {
        alert('Veuillez sélectionner un attribut de tri pour la concaténation');
        return;
      }

      onConfirm({
        insertionType: 'aggregation',
        aggregationAttributeId,
        aggregationType,
        sortAttributeId: aggregationType === 'CONCAT' ? aggregationSortAttributeId : undefined,
        sortDirection: aggregationType === 'CONCAT' ? aggregationSortDirection : undefined,
      });
      onClose();
      return;
    }

    if (selectedAttributeIds.length === 0) {
      alert('Veuillez sélectionner au moins un attribut');
      return;
    }

    if (specialType === 'applicable') {
      if (referenceType === 'custom' && !customDate) {
        alert('Veuillez sélectionner une date cible');
        return;
      }

      if (referenceType === 'attribute' && !referenceAttributeId) {
        alert('Veuillez sélectionner un attribut de date du rapport');
        return;
      }

      onConfirm({
        insertionType: 'applicable',
        selectedAttributeIds,
        dateReference:
          referenceType === 'custom'
            ? { type: 'custom', customDate }
            : referenceType === 'attribute'
            ? { type: 'attribute', attributeId: referenceAttributeId }
            : { type: 'today' },
      });
      onClose();
      return;
    }

    if (!sortAttributeId) {
      alert('Veuillez sélectionner un attribut de tri');
      return;
    }

    onConfirm({
      insertionType: specialType,
      selectedAttributeIds,
      sortAttributeId,
      smartFilterGroups,
      applyApplicableToday,
    });
    onClose();
  };

  const renderGroupedAttributesList = (tone: 'blue' | 'indigo' | 'yellow') => {
    const textClass =
      tone === 'blue' ? 'text-blue-700' : tone === 'indigo' ? 'text-indigo-700' : 'text-amber-700';
    const borderClass =
      tone === 'blue' ? 'border-blue-100' : tone === 'indigo' ? 'border-indigo-100' : 'border-amber-100';
    const sectionClass =
      tone === 'blue'
        ? 'border-blue-200 bg-blue-50'
        : tone === 'indigo'
        ? 'border-indigo-200 bg-indigo-50'
        : 'border-amber-200 bg-amber-50';
    const inputClass =
      tone === 'blue' ? 'border-blue-200' : tone === 'indigo' ? 'border-indigo-200' : 'border-amber-200';

    return (
      <div className={`rounded border p-3 ${sectionClass}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-gray-700">
            Attributs à insérer dans le rapport
          </label>
        </div>
        {smartObjects.length > 0 && (
          <div className="mb-2">
            <div className="mb-1.5 flex flex-wrap gap-2">
              {smartObjects.map((smartObject) => (
                <button
                  key={smartObject.title}
                  type="button"
                  onClick={() => applySmartObject(smartObject)}
                  className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100"
                >
                  {smartObject.title}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">
              Les filtres correspondants seront appliqués à l'étape suivante.
            </p>
          </div>
        )}
        <input
          type="text"
          value={attributeSearchTerm}
          onChange={(e) => setAttributeSearchTerm(e.target.value)}
          placeholder="Rechercher un attribut..."
          className={`mb-2 w-full rounded bg-white px-3 py-2 text-sm ${inputClass}`}
        />
        <div className={`max-h-[58vh] space-y-2 overflow-auto rounded border bg-white p-2 ${borderClass}`}>
          {groupedFilteredAttributes.length === 0 ? (
            <p className="px-1 py-2 text-sm text-gray-500">Aucun attribut ne correspond à la recherche.</p>
          ) : (
            groupedFilteredAttributes.map((group) => (
              <div key={group.key} className="rounded border border-gray-100 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{group.name}</span>
                  <div className="flex items-center gap-3 text-xs">
                    {group.attributes.some((attr) => !!attr.magicSel) && (
                      <button
                        type="button"
                        onClick={() => selectGroupSmartAttributesRecursively(group.key)}
                        className={`${textClass} hover:underline`}
                      >
                        Sélection intelligente
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => selectGroupAllAttributes(group.key)}
                      className={`${textClass} hover:underline`}
                    >
                      Sélectionner tout
                    </button>
                    <button
                      type="button"
                      onClick={() => clearGroupAttributes(group.key)}
                      className={`${textClass} hover:underline`}
                    >
                      Désélectionner tout
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {group.attributes.map((attr) => (
                    <label key={attr.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedAttributeIds.includes(attr.id)}
                        onChange={() => toggleAttribute(attr.id)}
                        className="size-4"
                      />
                      <span>{attr.displayName}</span>
                      <InfoHint text={attr.description} />
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Objet : {objectName}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1">
          {mode === 'detailed' && (
            <>{renderGroupedAttributesList('blue')}</>
          )}

          {mode === 'operation' && (
            <div className="space-y-3 rounded border border-amber-200 bg-amber-50 p-3">
              <div className="space-y-2">
                {hasMultipleCardinality && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="operationType"
                        value="first"
                        checked={operationType === 'first'}
                        onChange={() => setOperationType('first')}
                        className="size-4"
                      />
                      <span>Première instance</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="operationType"
                        value="last"
                        checked={operationType === 'last'}
                        onChange={() => setOperationType('last')}
                        className="size-4"
                      />
                      <span>Dernière instance</span>
                    </label>
                  </>
                )}

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="operationType"
                    value="aggregation"
                    checked={operationType === 'aggregation'}
                    onChange={() => setOperationType('aggregation')}
                    className="size-4"
                  />
                  <span>Agrégation</span>
                </label>
              </div>

              {(operationType === 'first' || operationType === 'last') && hasMultipleCardinality && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Attribut de tri</label>
                  <select
                    value={sortAttributeId}
                    onChange={(e) => setSortAttributeId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionner un attribut</option>
                    {availableAttributes.map((attr) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {operationType === 'aggregation' ? (
                <div className="space-y-3 rounded border border-amber-300 bg-amber-50/40 p-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Opération</label>
                    <select
                      value={aggregationType}
                      onChange={(e) => {
                        const nextOp = e.target.value as AggregationType;
                        setAggregationType(nextOp);
                        if (aggregationAttributeId) {
                          const currentAttr = availableAttributes.find((a) => a.id === aggregationAttributeId);
                          const allowed = currentAttr?.type === 'number'
                            ? ['COUNT', 'CONCAT', 'SUM', 'MIN', 'MAX', 'AVG']
                            : currentAttr?.type === 'date'
                            ? ['COUNT', 'CONCAT', 'MIN', 'MAX']
                            : ['COUNT', 'CONCAT'];
                          if (!allowed.includes(nextOp)) setAggregationAttributeId('');
                        }
                      }}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      {allAggregations.map((agg) => (
                        <option key={agg} value={agg}>
                          {aggregationLabels[agg]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Attribut à agréger</label>
                    <select
                      value={aggregationAttributeId}
                      onChange={(e) => setAggregationAttributeId(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Sélectionner un attribut</option>
                      {availableAttributes
                        .filter((attr) => {
                          if (aggregationType === 'SUM' || aggregationType === 'AVG') return attr.type === 'number';
                          if (aggregationType === 'MIN' || aggregationType === 'MAX') return attr.type === 'number' || attr.type === 'date';
                          return true;
                        })
                        .map((attr) => (
                          <option key={attr.id} value={attr.id}>
                            {attr.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {aggregationType === 'CONCAT' && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Attribut de tri pour la concaténation
                        </label>
                        <select
                          value={aggregationSortAttributeId}
                          onChange={(e) => setAggregationSortAttributeId(e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="">Sélectionner un attribut</option>
                          {availableAttributes.map((attr) => (
                            <option key={attr.id} value={attr.id}>
                              {attr.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Sens du tri
                        </label>
                        <select
                          value={aggregationSortDirection}
                          onChange={(e) => setAggregationSortDirection(e.target.value as 'asc' | 'desc')}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="asc">Croissant</option>
                          <option value="desc">Décroissant</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                renderGroupedAttributesList('yellow')
              )}
            </div>
          )}

          {mode === 'aggregation' && (
            <div className="space-y-3 rounded border border-purple-200 bg-purple-50 p-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Opération</label>
                <select
                  value={aggregationType}
                  onChange={(e) => {
                    const nextOp = e.target.value as AggregationType;
                    setAggregationType(nextOp);
                    // Réinitialise l'attribut si incompatible avec la nouvelle opération
                    if (aggregationAttributeId) {
                      const currentAttr = availableAttributes.find((a) => a.id === aggregationAttributeId);
                      const allowed = currentAttr?.type === 'number'
                        ? ['COUNT', 'CONCAT', 'SUM', 'MIN', 'MAX', 'AVG']
                        : currentAttr?.type === 'date'
                        ? ['COUNT', 'CONCAT', 'MIN', 'MAX']
                        : ['COUNT', 'CONCAT'];
                      if (!allowed.includes(nextOp)) setAggregationAttributeId('');
                    }
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  {allAggregations.map((agg) => (
                    <option key={agg} value={agg}>
                      {aggregationLabels[agg]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Attribut à agréger</label>
                <select
                  value={aggregationAttributeId}
                  onChange={(e) => setAggregationAttributeId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner un attribut</option>
                  {availableAttributes
                    .filter((attr) => {
                      if (aggregationType === 'SUM' || aggregationType === 'AVG') return attr.type === 'number';
                      if (aggregationType === 'MIN' || aggregationType === 'MAX') return attr.type === 'number' || attr.type === 'date';
                      return true; // COUNT et CONCAT acceptent tout
                    })
                    .map((attr) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.name}
                      </option>
                    ))}
                </select>
              </div>

              {aggregationType === 'CONCAT' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Attribut de tri pour la concaténation
                    </label>
                    <select
                      value={aggregationSortAttributeId}
                      onChange={(e) => setAggregationSortAttributeId(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Sélectionner un attribut</option>
                      {availableAttributes.map((attr) => (
                        <option key={attr.id} value={attr.id}>
                          {attr.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Sens du tri
                    </label>
                    <select
                      value={aggregationSortDirection}
                      onChange={(e) => setAggregationSortDirection(e.target.value as 'asc' | 'desc')}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="asc">Croissant</option>
                      <option value="desc">Décroissant</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'special' && (
            <div className="space-y-3 rounded border border-indigo-200 bg-indigo-50 p-3">
              <div className="space-y-2">
                {hasMultipleCardinality && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="specialType"
                        value="first"
                        checked={specialType === 'first'}
                        onChange={() => setSpecialType('first')}
                        className="size-4"
                      />
                      <span>Première instance</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="specialType"
                        value="last"
                        checked={specialType === 'last'}
                        onChange={() => setSpecialType('last')}
                        className="size-4"
                      />
                      <span>Dernière instance</span>
                    </label>
                  </>
                )}

                {objectSupportsApplicable && (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="specialType"
                      value="applicable"
                      checked={specialType === 'applicable'}
                      onChange={() => setSpecialType('applicable')}
                      className="size-4"
                    />
                    <span>Instance applicable à une date</span>
                  </label>
                )}
              </div>

              {(specialType === 'first' || specialType === 'last') && hasMultipleCardinality && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Attribut de tri</label>
                  <select
                    value={sortAttributeId}
                    onChange={(e) => setSortAttributeId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionner un attribut</option>
                    {availableAttributes.map((attr) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {specialType === 'applicable' && objectSupportsApplicable && (
                <div className="space-y-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date cible</label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="referenceType"
                      value="today"
                      checked={referenceType === 'today'}
                      onChange={() => setReferenceType('today')}
                      className="size-4"
                    />
                    <span>Date du jour</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="referenceType"
                      value="custom"
                      checked={referenceType === 'custom'}
                      onChange={() => setReferenceType('custom')}
                      className="size-4"
                    />
                    <span>Date personnalisée</span>
                  </label>
                  {referenceType === 'custom' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  )}

                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="referenceType"
                      value="attribute"
                      checked={referenceType === 'attribute'}
                      onChange={() => setReferenceType('attribute')}
                      className="mt-0.5 size-4"
                      disabled={availableDateAttributes.length === 0}
                    />
                    <div className="flex-1">
                      <span className={availableDateAttributes.length === 0 ? 'text-gray-400' : ''}>
                        Date d'un attribut déjà sélectionné
                      </span>
                      {availableDateAttributes.length === 0 && (
                        <p className="text-xs text-gray-500">Aucun attribut date sélectionné dans le rapport</p>
                      )}
                      {referenceType === 'attribute' && availableDateAttributes.length > 0 && (
                        <select
                          value={referenceAttributeId}
                          onChange={(e) => setReferenceAttributeId(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="">Sélectionner un attribut date</option>
                          {availableDateAttributes.map((attr) => (
                            <option key={attr.id} value={attr.id}>
                              {attr.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                </div>
              )}

              <div>
                {renderGroupedAttributesList('indigo')}
              </div>
            </div>
          )}
        </div>

        {mode !== 'aggregation' && (
          <div className="mt-4 text-sm text-gray-600">
            {selectedAttributeIds.length} attribut{selectedAttributeIds.length > 1 ? 's' : ''} sélectionné{selectedAttributeIds.length > 1 ? 's' : ''}
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}