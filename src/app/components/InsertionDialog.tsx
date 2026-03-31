import { useState } from 'react';
import { X } from 'lucide-react';
import { AttributeType } from '../data/dataStructure';
import { AggregationType, InsertionType } from '../types/selection';

interface InsertionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  attributeName: string;
  attributeType: AttributeType;
  cardinality: string;
  allowDetailedList?: boolean;
  objectSupportsApplicable?: boolean;
  availableAttributes: Array<{ id: string; name: string; type: AttributeType }>;
  onConfirm: (
    insertionType: InsertionType,
    sortAttributeId?: string,
    sortDirection?: 'asc' | 'desc',
    aggregationType?: AggregationType
  ) => void;
}

export function InsertionDialog({
  isOpen,
  onClose,
  attributeName,
  attributeType,
  cardinality,
  allowDetailedList = true,
  objectSupportsApplicable = false,
  availableAttributes,
  onConfirm,
}: InsertionDialogProps) {
  const [valueMode, setValueMode] = useState<'detailed' | 'special'>(allowDetailedList ? 'detailed' : 'special');
  const [specialMode, setSpecialMode] = useState<'aggregation' | 'instance'>('aggregation');
  const [instanceMode, setInstanceMode] = useState<'first' | 'last' | 'applicable'>('first');
  const [sortAttributeId, setSortAttributeId] = useState<string>('');
  const [aggregationType, setAggregationType] = useState<AggregationType>('COUNT');

  if (!isOpen) return null;

  const hasMultipleCardinality = cardinality.includes('n');

  const getAvailableAggregations = (): AggregationType[] => {
    const base: AggregationType[] = ['COUNT', 'CONCAT'];
    if (attributeType === 'number') {
      return [...base, 'SUM', 'MIN', 'MAX', 'AVG'];
    }
    if (attributeType === 'date') {
      return [...base, 'MIN', 'MAX'];
    }
    return base;
  };

  const handleConfirm = () => {
    if (allowDetailedList && valueMode === 'detailed') {
      onConfirm('normal');
      onClose();
      return;
    }

    if (specialMode === 'aggregation') {
      onConfirm('aggregation', undefined, undefined, aggregationType);
      onClose();
      return;
    }

    if (instanceMode === 'applicable') {
      onConfirm('applicable');
      onClose();
      return;
    }

    if (!sortAttributeId) {
      alert('Veuillez sélectionner un attribut de tri');
      return;
    }

    onConfirm(instanceMode, sortAttributeId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Type d'insertion</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Attribut : <span className="font-medium">{attributeName}</span>
          </p>
          <p className="text-sm text-gray-600">Cardinalité : <span className="font-medium">{cardinality}</span></p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type de valeur à remonter
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="valueMode"
                  value="detailed"
                  checked={valueMode === 'detailed'}
                  onChange={() => allowDetailedList && setValueMode('detailed')}
                  disabled={!allowDetailedList}
                  className="size-4"
                />
                <span className={allowDetailedList ? 'text-gray-700' : 'text-gray-400'}>Liste détaillée</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="valueMode"
                  value="special"
                  checked={valueMode === 'special'}
                  onChange={() => setValueMode('special')}
                  className="size-4"
                />
                <span className="text-gray-700">Valeur spéciale</span>
              </label>
            </div>
            {!allowDetailedList && (
              <p className="mt-2 text-xs text-gray-500">
                La liste détaillée n'est disponible que pour l'objet principal du rapport.
              </p>
            )}
          </div>

          {valueMode === 'special' && (
            <div className="space-y-3 rounded border border-blue-200 bg-blue-50 p-3">
              <div className="space-y-2">
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
              </div>

              {specialMode === 'instance' && (
                <div className="space-y-2 border-t border-blue-200 pt-2">
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
              )}

              {specialMode === 'instance' && (instanceMode === 'first' || instanceMode === 'last') && (
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
            </div>
          )}

          {valueMode === 'special' && specialMode === 'aggregation' && (
            <div className="rounded border border-green-200 bg-green-50 p-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Type d'agrégation
                </label>
                <select
                  value={aggregationType}
                  onChange={(e) => setAggregationType(e.target.value as AggregationType)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  {getAvailableAggregations().map((agg) => (
                    <option key={agg} value={agg}>
                      {agg}
                    </option>
                  ))}
                </select>
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
