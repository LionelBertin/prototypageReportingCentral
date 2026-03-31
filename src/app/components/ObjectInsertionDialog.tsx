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
  availableAttributes: Array<{ id: string; name: string; type: AttributeType; magicSel?: boolean; smartSel?: boolean }>;
  availableDateAttributes: Array<{ id: string; name: string }>;
  initialMode: ObjectInsertionMode;
  initialConfig?: Partial<ObjectInsertionConfig>;
  onConfirm: (config: ObjectInsertionConfig) => void;
}

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

  if (!isOpen) return null;

  const toggleAttribute = (attributeId: string) => {
    setSelectedAttributeIds((prev) =>
      prev.includes(attributeId) ? prev.filter((id) => id !== attributeId) : [...prev, attributeId]
    );
  };

  const selectAllAttributes = () => {
    setSelectedAttributeIds(availableAttributes.map((attr) => attr.id));
  };

  const selectSmartAttributes = () => {
    setSelectedAttributeIds(
      availableAttributes.filter((attr) => !!attr.smartSel).map((attr) => attr.id)
    );
  };

  const clearAllAttributes = () => {
    setSelectedAttributeIds([]);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Insertion depuis l'objet</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-4 space-y-1">
          <p className="text-sm text-gray-600">
            Objet : <span className="font-medium">{objectName}</span>
          </p>
        </div>

        <div className="space-y-4">
          {mode === 'detailed' && (
            <div className="rounded border border-blue-200 bg-blue-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Attributs à insérer dans le rapport
                </label>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={selectSmartAttributes}
                    className="text-blue-700 hover:underline"
                  >
                    Sélection intelligente
                  </button>
                  <button
                    type="button"
                    onClick={selectAllAttributes}
                    className="text-blue-700 hover:underline"
                  >
                    Sélectionner tout
                  </button>
                  <button
                    type="button"
                    onClick={clearAllAttributes}
                    className="text-blue-700 hover:underline"
                  >
                    Désélectionner tout
                  </button>
                </div>
              </div>
              <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto rounded border border-blue-100 bg-white p-2 sm:grid-cols-2">
                {availableAttributes.map((attr) => (
                  <label key={attr.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedAttributeIds.includes(attr.id)}
                      onChange={() => toggleAttribute(attr.id)}
                      className="size-4"
                    />
                    <span>{attr.name}</span>
                  </label>
                ))}
              </div>
            </div>
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Attributs à insérer dans le rapport
                  </label>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={selectSmartAttributes}
                      className="text-indigo-700 hover:underline"
                    >
                      Sélection intelligente
                    </button>
                    <button
                      type="button"
                      onClick={selectAllAttributes}
                      className="text-indigo-700 hover:underline"
                    >
                      Sélectionner tout
                    </button>
                    <button
                      type="button"
                      onClick={clearAllAttributes}
                      className="text-indigo-700 hover:underline"
                    >
                      Désélectionner tout
                    </button>
                  </div>
                </div>
                <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto rounded border border-indigo-100 bg-white p-2 sm:grid-cols-2">
                  {availableAttributes.map((attr) => (
                    <label key={attr.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedAttributeIds.includes(attr.id)}
                        onChange={() => toggleAttribute(attr.id)}
                        className="size-4"
                      />
                      <span>{attr.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
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