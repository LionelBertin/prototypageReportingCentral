import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { AttributeType } from '../data/dataStructure';
import type { AggregationType, DateReference, InsertionType } from '../types/selection';

export interface MainObjectModeConfig {
  insertionType: Extract<InsertionType, 'normal' | 'first' | 'last' | 'applicable' | 'aggregation'>;
  sortAttributeId?: string;
  aggregationAttributeId?: string;
  aggregationType?: AggregationType;
  dateReference?: DateReference;
}

interface MainObjectModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  objectName: string;
  cardinality: string;
  objectSupportsApplicable?: boolean;
  availableAttributes: Array<{ id: string; name: string; type: AttributeType }>;
  onConfirm: (config: MainObjectModeConfig) => void;
}

export function MainObjectModeDialog({
  isOpen,
  onClose,
  objectName,
  cardinality,
  objectSupportsApplicable = false,
  availableAttributes,
  onConfirm,
}: MainObjectModeDialogProps) {
  const hasMultipleCardinality = cardinality.includes('n');
  const supportsSpecialValue = hasMultipleCardinality || objectSupportsApplicable;

  const [valueMode, setValueMode] = useState<'detailed' | 'special'>('detailed');
  const [specialMode, setSpecialMode] = useState<'aggregation' | 'instance'>(
    hasMultipleCardinality ? 'aggregation' : 'instance'
  );
  const [instanceMode, setInstanceMode] = useState<'first' | 'last' | 'applicable'>(
    hasMultipleCardinality ? 'first' : 'applicable'
  );
  const [sortAttributeId, setSortAttributeId] = useState('');
  const [aggregationAttributeId, setAggregationAttributeId] = useState('');
  const [aggregationType, setAggregationType] = useState<AggregationType>('COUNT');
  const [referenceType, setReferenceType] = useState<DateReference['type']>('today');
  const [customDate, setCustomDate] = useState('');

  const selectedAggregationAttribute = useMemo(
    () => availableAttributes.find((attr) => attr.id === aggregationAttributeId),
    [aggregationAttributeId, availableAttributes]
  );

  const getAvailableAggregations = (): AggregationType[] => {
    const base: AggregationType[] = ['COUNT', 'CONCAT'];
    if (!selectedAggregationAttribute) {
      return base;
    }

    if (selectedAggregationAttribute.type === 'number') {
      return [...base, 'SUM', 'MIN', 'MAX', 'AVG'];
    }

    if (selectedAggregationAttribute.type === 'date') {
      return [...base, 'MIN', 'MAX'];
    }

    return base;
  };

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!supportsSpecialValue || valueMode === 'detailed') {
      onConfirm({ insertionType: 'normal' });
      onClose();
      return;
    }

    if (specialMode === 'aggregation' && hasMultipleCardinality) {
      if (!aggregationAttributeId) {
        alert('Veuillez sélectionner un attribut à agréger');
        return;
      }

      onConfirm({
        insertionType: 'aggregation',
        aggregationAttributeId,
        aggregationType,
      });
      onClose();
      return;
    }

    if (instanceMode === 'applicable') {
      if (referenceType === 'custom' && !customDate) {
        alert('Veuillez sélectionner une date cible');
        return;
      }

      onConfirm({
        insertionType: 'applicable',
        dateReference: referenceType === 'custom' ? { type: 'custom', customDate } : { type: 'today' },
      });
      onClose();
      return;
    }

    if (!sortAttributeId) {
      alert('Veuillez sélectionner un attribut de tri');
      return;
    }

    onConfirm({
      insertionType: instanceMode,
      sortAttributeId,
    });
    onClose();
  };

  const availableAggregations = getAvailableAggregations();
  const canAggregate = hasMultipleCardinality;
  const canSelectInstance = hasMultipleCardinality || objectSupportsApplicable;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Type du rapport</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-4 space-y-1">
          <p className="text-sm text-gray-600">
            Objet principal : <span className="font-medium">{objectName}</span>
          </p>
          <p className="text-sm text-gray-600">
            Cardinalité : <span className="font-medium">{cardinality}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nature du rapport
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="valueMode"
                  value="detailed"
                  checked={valueMode === 'detailed'}
                  onChange={() => setValueMode('detailed')}
                  className="size-4"
                />
                <span className="text-gray-700">Liste détaillée</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="valueMode"
                  value="special"
                  checked={valueMode === 'special'}
                  onChange={() => {
                    if (!supportsSpecialValue) return;
                    setValueMode('special');
                    if (!hasMultipleCardinality) {
                      setSpecialMode('instance');
                      setInstanceMode('applicable');
                    }
                  }}
                  disabled={!supportsSpecialValue}
                  className="size-4"
                />
                <span className={!supportsSpecialValue ? 'text-gray-400' : 'text-gray-700'}>Valeur spéciale</span>
              </label>
            </div>
          </div>

          {valueMode === 'special' && supportsSpecialValue && (
            <div className="space-y-3 rounded border border-blue-200 bg-blue-50 p-3">
              <div className="space-y-2">
                {canAggregate && (
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="specialMode"
                      value="aggregation"
                      checked={specialMode === 'aggregation'}
                      onChange={() => setSpecialMode('aggregation')}
                      className="size-4"
                    />
                    <span className="text-sm text-gray-700">Agrégation</span>
                  </label>
                )}

                {canSelectInstance && (
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="specialMode"
                      value="instance"
                      checked={specialMode === 'instance'}
                      onChange={() => setSpecialMode('instance')}
                      className="size-4"
                    />
                    <span className="text-sm text-gray-700">Instance particulière</span>
                  </label>
                )}
              </div>

              {specialMode === 'aggregation' && canAggregate && (
                <div className="space-y-3 border-t border-blue-200 pt-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Attribut à agréger
                    </label>
                    <select
                      value={aggregationAttributeId}
                      onChange={(e) => {
                        const nextAttributeId = e.target.value;
                        setAggregationAttributeId(nextAttributeId);
                        const nextAttribute = availableAttributes.find((attr) => attr.id === nextAttributeId);
                        const nextAllowedAggregations = nextAttribute?.type === 'number'
                          ? ['COUNT', 'CONCAT', 'SUM', 'MIN', 'MAX', 'AVG']
                          : nextAttribute?.type === 'date'
                          ? ['COUNT', 'CONCAT', 'MIN', 'MAX']
                          : ['COUNT', 'CONCAT'];
                        if (!nextAllowedAggregations.includes(aggregationType)) {
                          setAggregationType(nextAllowedAggregations[0] as AggregationType);
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Opération
                    </label>
                    <select
                      value={aggregationType}
                      onChange={(e) => setAggregationType(e.target.value as AggregationType)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      {availableAggregations.map((agg) => (
                        <option key={agg} value={agg}>
                          {agg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {specialMode === 'instance' && canSelectInstance && (
                <div className="space-y-3 border-t border-blue-200 pt-3">
                  <div className="space-y-2">
                    {hasMultipleCardinality && (
                      <>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="instanceMode"
                            value="first"
                            checked={instanceMode === 'first'}
                            onChange={() => setInstanceMode('first')}
                            className="size-4"
                          />
                          <span className="text-sm text-gray-700">Première instance</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="instanceMode"
                            value="last"
                            checked={instanceMode === 'last'}
                            onChange={() => setInstanceMode('last')}
                            className="size-4"
                          />
                          <span className="text-sm text-gray-700">Dernière instance</span>
                        </label>
                      </>
                    )}

                    {objectSupportsApplicable && (
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="instanceMode"
                          value="applicable"
                          checked={instanceMode === 'applicable'}
                          onChange={() => setInstanceMode('applicable')}
                          className="size-4"
                        />
                        <span className="text-sm text-gray-700">Instance applicable à une date</span>
                      </label>
                    )}
                  </div>

                  {(instanceMode === 'first' || instanceMode === 'last') && hasMultipleCardinality && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Attribut de tri
                      </label>
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

                  {instanceMode === 'applicable' && objectSupportsApplicable && (
                    <div className="space-y-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Date cible
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="referenceType"
                          value="today"
                          checked={referenceType === 'today'}
                          onChange={() => setReferenceType('today')}
                          className="size-4"
                        />
                        <span className="text-sm text-gray-700">Date du jour</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="referenceType"
                          value="custom"
                          checked={referenceType === 'custom'}
                          onChange={() => setReferenceType('custom')}
                          className="size-4"
                        />
                        <span className="text-sm text-gray-700">Date personnalisée</span>
                      </label>
                      {referenceType === 'custom' && (
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
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