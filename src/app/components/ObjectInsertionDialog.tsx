import { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AttributeType } from '../data/dataStructure';
import type { AggregationType, DateReference, InsertionType } from '../types/selection';

type ObjectInsertionMode = 'detailed' | 'aggregation' | 'special';

export interface ObjectInsertionConfig {
  insertionType: Extract<InsertionType, 'normal' | 'aggregation' | 'first' | 'last' | 'applicable'>;
  selectedAttributeIds?: string[];
  aggregationAttributeId?: string;
  aggregationType?: AggregationType;
  sortAttributeId?: string;
  sortDirection?: 'asc' | 'desc';
  dateReference?: DateReference;
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
    type: AttributeType;
    magicSel?: boolean;
    smartSel?: boolean;
    sourceObjectName?: string;
    relativeNavigationPath?: Array<{ objectName: string }>;
  }>;
  availableDateAttributes: Array<{ id: string; name: string }>;
  initialMode: ObjectInsertionMode;
  initialConfig?: Partial<ObjectInsertionConfig>;
  onConfirm: (config: ObjectInsertionConfig) => void;
}

type GroupedAttribute = {
  id: string;
  name: string;
  displayName: string;
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
  const [sortAttributeId, setSortAttributeId] = useState<string>('');
  const [referenceType, setReferenceType] = useState<DateReference['type']>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [referenceAttributeId, setReferenceAttributeId] = useState<string>('');
  const [attributeSearchTerm, setAttributeSearchTerm] = useState<string>('');

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
    setSortAttributeId(initialConfig?.sortAttributeId ?? '');
    setReferenceType(initialConfig?.dateReference?.type ?? 'today');
    setCustomDate(initialConfig?.dateReference?.customDate ?? '');
    setReferenceAttributeId(initialConfig?.dateReference?.attributeId ?? '');
    setAttributeSearchTerm('');
  }, [isOpen, availableAttributes, initialConfig, objectSupportsApplicable, cardinality]);

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
    if (mode === 'detailed') {
      if (selectedAttributeIds.length === 0) {
        alert('Veuillez sélectionner au moins un attribut');
        return;
      }

      onConfirm({
        insertionType: 'normal',
        selectedAttributeIds,
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
    });
    onClose();
  };

  const renderGroupedAttributesList = (tone: 'blue' | 'indigo') => {
    const textClass = tone === 'blue' ? 'text-blue-700' : 'text-indigo-700';
    const borderClass = tone === 'blue' ? 'border-blue-100' : 'border-indigo-100';
    const sectionClass = tone === 'blue' ? 'border-blue-200 bg-blue-50' : 'border-indigo-200 bg-indigo-50';
    const inputClass = tone === 'blue' ? 'border-blue-200' : 'border-indigo-200';

    return (
      <div className={`rounded border p-3 ${sectionClass}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-gray-700">
            Attributs à insérer dans le rapport
          </label>
        </div>
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

          {mode === 'aggregation' && (
            <div className="space-y-3 rounded border border-purple-200 bg-purple-50 p-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Attribut à agréger</label>
                <select
                  value={aggregationAttributeId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setAggregationAttributeId(nextId);
                    const nextAttr = availableAttributes.find((attr) => attr.id === nextId);
                    const nextAllowed = nextAttr?.type === 'number'
                      ? ['COUNT', 'CONCAT', 'SUM', 'MIN', 'MAX', 'AVG']
                      : nextAttr?.type === 'date'
                      ? ['COUNT', 'CONCAT', 'MIN', 'MAX']
                      : ['COUNT', 'CONCAT'];
                    if (!nextAllowed.includes(aggregationType)) {
                      setAggregationType(nextAllowed[0] as AggregationType);
                    }
                  }}
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Opération</label>
                <select
                  value={aggregationType}
                  onChange={(e) => setAggregationType(e.target.value as AggregationType)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  {(aggregationAttributeId ? availableAggregationTypes : allAggregations.slice(0, 2)).map((agg) => (
                    <option key={agg} value={agg}>
                      {aggregationLabels[agg]}
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