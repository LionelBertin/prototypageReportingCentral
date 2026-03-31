import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { AttributeType } from '../data/dataStructure';
import { FilterCondition, Compartment, CompartmentConfig } from '../types/selection';

interface CompartmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  attributeName: string;
  attributeType: AttributeType;
  currentCompartmentConfig?: CompartmentConfig;
  onConfirm: (compartmentConfig?: CompartmentConfig) => void;
  selectedDateAttributes?: Array<{ id: string; name: string; columnName?: string }>;
}

export function CompartmentDialog({
  isOpen,
  onClose,
  attributeName,
  attributeType,
  currentCompartmentConfig,
  onConfirm,
  selectedDateAttributes,
}: CompartmentDialogProps) {
  const [compartments, setCompartments] = useState<Compartment[]>(
    currentCompartmentConfig && currentCompartmentConfig.compartments.length > 0
      ? currentCompartmentConfig.compartments
      : [{
          name: '',
          conditions: [{
            attributeId: '',
            attributeName: attributeName,
            attributeType: attributeType,
            operator: 'equals',
            value: '',
          }],
          logicalOperator: 'ET',
        }]
  );

  useEffect(() => {
    if (isOpen) {
      if (currentCompartmentConfig && currentCompartmentConfig.compartments.length > 0) {
        setCompartments(currentCompartmentConfig.compartments);
      } else {
        setCompartments([{
          name: '',
          conditions: [{
            attributeId: '',
            attributeName: attributeName,
            attributeType: attributeType,
            operator: 'equals',
            value: '',
          }],
          logicalOperator: 'ET',
        }]);
      }
    }
  }, [isOpen, currentCompartmentConfig, attributeName, attributeType]);

  if (!isOpen) return null;

  const getAvailableOperators = (attrType: AttributeType): Array<{ value: FilterCondition['operator']; label: string }> => {
    const common = [
      { value: 'equals' as const, label: 'Égal à' },
      { value: 'notEquals' as const, label: 'Différent de' },
    ];

    if (attrType === 'number' || attrType === 'date') {
      const operators = [
        ...common,
        { value: 'greaterThan' as const, label: 'Supérieur à' },
        { value: 'lessThan' as const, label: 'Inférieur à' },
        { value: 'greaterOrEqual' as const, label: 'Supérieur ou égal à' },
        { value: 'lessOrEqual' as const, label: 'Inférieur ou égal à' },
      ];
      
      if (attrType === 'date') {
        operators.push(
          { value: 'isEmpty' as const, label: 'Vide' },
          { value: 'isNotEmpty' as const, label: 'Renseignée' }
        );
      }
      
      return operators;
    }

    if (attrType === 'string') {
      return [
        ...common,
        { value: 'contains' as const, label: 'Contient' },
        { value: 'startsWith' as const, label: 'Commence par' },
        { value: 'endsWith' as const, label: 'Termine par' },
      ];
    }

    return common;
  };

  const getOperatorLabel = (operator: FilterCondition['operator']): string => {
    const allOperators = [
      { value: 'equals' as const, label: '=' },
      { value: 'notEquals' as const, label: '≠' },
      { value: 'greaterThan' as const, label: '>' },
      { value: 'lessThan' as const, label: '<' },
      { value: 'greaterOrEqual' as const, label: '≥' },
      { value: 'lessOrEqual' as const, label: '≤' },
      { value: 'contains' as const, label: 'contient' },
      { value: 'startsWith' as const, label: 'commence par' },
      { value: 'endsWith' as const, label: 'termine par' },
      { value: 'isEmpty' as const, label: 'vide' },
      { value: 'isNotEmpty' as const, label: 'renseignée' },
    ];
    return allOperators.find(op => op.value === operator)?.label || operator;
  };

  const addConditionToCompartment = (compartmentIndex: number) => {
    const newCompartments = [...compartments];
    newCompartments[compartmentIndex].conditions.push({
      attributeId: '',
      attributeName: attributeName,
      attributeType: attributeType,
      operator: 'equals',
      value: '',
    });
    setCompartments(newCompartments);
  };

  const removeConditionFromCompartment = (compartmentIndex: number, conditionIndex: number) => {
    const newCompartments = [...compartments];
    newCompartments[compartmentIndex].conditions.splice(conditionIndex, 1);
    
    // Si le compartiment n'a plus de conditions, le supprimer
    if (newCompartments[compartmentIndex].conditions.length === 0) {
      newCompartments.splice(compartmentIndex, 1);
    }
    
    // S'il n'y a plus de compartiments, ajouter un compartiment vide
    if (newCompartments.length === 0) {
      newCompartments.push({
        name: '',
        conditions: [{
          attributeId: '',
          attributeName: attributeName,
          attributeType: attributeType,
          operator: 'equals',
          value: '',
        }],
        logicalOperator: 'ET',
      });
    }
    
    setCompartments(newCompartments);
  };

  const addCompartment = () => {
    setCompartments([
      ...compartments,
      {
        name: '',
        conditions: [{
          attributeId: '',
          attributeName: attributeName,
          attributeType: attributeType,
          operator: 'equals',
          value: '',
        }],
        logicalOperator: 'ET',
      },
    ]);
  };

  const removeCompartment = (compartmentIndex: number) => {
    const newCompartments = [...compartments];
    newCompartments.splice(compartmentIndex, 1);
    
    // S'il n'y a plus de compartiments, ajouter un compartiment vide
    if (newCompartments.length === 0) {
      newCompartments.push({
        name: '',
        conditions: [{
          attributeId: '',
          attributeName: attributeName,
          attributeType: attributeType,
          operator: 'equals',
          value: '',
        }],
        logicalOperator: 'ET',
      });
    }
    
    setCompartments(newCompartments);
  };

  const updateCondition = (
    compartmentIndex: number,
    conditionIndex: number,
    field: keyof FilterCondition,
    value: any
  ) => {
    const newCompartments = [...compartments];
    (newCompartments[compartmentIndex].conditions[conditionIndex] as any)[field] = value;
    setCompartments(newCompartments);
  };

  const updateCompartmentOperator = (compartmentIndex: number, operator: 'ET' | 'OU') => {
    const newCompartments = [...compartments];
    newCompartments[compartmentIndex].logicalOperator = operator;
    setCompartments(newCompartments);
  };

  const updateCompartmentName = (compartmentIndex: number, name: string) => {
    const newCompartments = [...compartments];
    newCompartments[compartmentIndex].name = name;
    setCompartments(newCompartments);
  };

  const handleConfirm = () => {
    // Filtrer les compartiments qui ont un nom et au moins une condition valide
    const validCompartments = compartments
      .filter(comp => comp.name.trim() !== '')
      .map(comp => ({
        ...comp,
        conditions: comp.conditions.filter(
          cond => (cond.value !== '' && cond.value !== null && cond.value !== undefined) || 
                  cond.operator === 'isEmpty' || 
                  cond.operator === 'isNotEmpty'
        ),
      }))
      .filter(comp => comp.conditions.length > 0);

    onConfirm(validCompartments.length > 0 ? { compartments: validCompartments } : undefined);
    onClose();
  };

  const handleRemoveAllCompartments = () => {
    onConfirm(undefined);
    onClose();
  };

  const parseValue = (condition: FilterCondition, valueStr: string): string | number | boolean => {
    if (condition.attributeType === 'number') {
      return parseFloat(valueStr);
    } else if (condition.attributeType === 'boolean') {
      return valueStr === 'true';
    }
    return valueStr;
  };

  const hasActiveCompartments = currentCompartmentConfig && currentCompartmentConfig.compartments.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Compartiments sur {attributeName}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        {hasActiveCompartments && (
          <div className="mb-4 rounded bg-green-50 p-3">
            <p className="mb-2 text-sm font-medium text-green-900">Compartiments actifs :</p>
            <div className="space-y-2 text-sm text-green-800">
              {currentCompartmentConfig.compartments.map((comp, idx) => (
                <div key={idx} className="ml-2">
                  <span className="font-bold">&quot;{comp.name}&quot;</span> si{' '}
                  {comp.conditions.length > 1 && <span>(</span>}
                  {comp.conditions.map((cond, cIdx) => (
                    <span key={cIdx}>
                      {cIdx > 0 && <span className="font-semibold text-green-900"> {comp.logicalOperator} </span>}
                      {getOperatorLabel(cond.operator)}
                      {cond.operator !== 'isEmpty' && cond.operator !== 'isNotEmpty' && (
                        cond.valueType === 'attribute' && cond.referenceAttributeName ? (
                          <span> <span className="italic">{cond.referenceAttributeName}</span></span>
                        ) : (
                          <span> {cond.value?.toString()}</span>
                        )
                      )}
                    </span>
                  ))}
                  {comp.conditions.length > 1 && <span>)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 rounded bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-medium">Fonctionnement :</p>
          <ul className="ml-4 mt-1 list-disc space-y-1">
            <li>Chaque compartiment remplace les valeurs qui correspondent à ses critères par le nom du compartiment</li>
            <li>Donnez un nom descriptif à chaque compartiment (ex: &quot;Tranche A&quot;, &quot;Fonction Support&quot;)</li>
            <li>Les compartiments sont évalués dans l&apos;ordre : la première correspondance détermine la valeur</li>
          </ul>
        </div>

        <div className="space-y-4">
          {compartments.map((compartment, compartmentIndex) => (
            <div key={compartmentIndex} className="rounded border-2 border-green-300 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex flex-1 items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Compartiment {compartmentIndex + 1}</span>
                  <input
                    type="text"
                    value={compartment.name}
                    onChange={(e) => updateCompartmentName(compartmentIndex, e.target.value)}
                    placeholder="Nom du compartiment (ex: Tranche A)"
                    className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateCompartmentOperator(compartmentIndex, 'ET')}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        compartment.logicalOperator === 'ET'
                          ? 'bg-green-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      ET
                    </button>
                    <button
                      onClick={() => updateCompartmentOperator(compartmentIndex, 'OU')}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        compartment.logicalOperator === 'OU'
                          ? 'bg-green-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      OU
                    </button>
                  </div>
                </div>
                {compartments.length > 1 && (
                  <button
                    onClick={() => removeCompartment(compartmentIndex)}
                    className="ml-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3" />
                    Supprimer
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {compartment.conditions.map((condition, conditionIndex) => (
                  <div key={conditionIndex} className="flex items-start gap-2">
                    {conditionIndex > 0 && (
                      <div className="flex h-10 items-center rounded bg-green-100 px-2 text-xs font-semibold text-green-700">
                        {compartment.logicalOperator}
                      </div>
                    )}
                    
                    <div className="flex flex-1 gap-2">
                      {/* Opérateur */}
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Opérateur
                        </label>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(compartmentIndex, conditionIndex, 'operator', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        >
                          {getAvailableOperators(condition.attributeType).map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Valeur */}
                      {condition.operator !== 'isEmpty' && condition.operator !== 'isNotEmpty' && (
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Valeur
                          </label>
                          {condition.attributeType === 'boolean' ? (
                            <select
                              value={condition.value?.toString() || ''}
                              onChange={(e) => updateCondition(compartmentIndex, conditionIndex, 'value', parseValue(condition, e.target.value))}
                              className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                            >
                              <option value="">Sélectionner</option>
                              <option value="true">Vrai</option>
                              <option value="false">Faux</option>
                            </select>
                          ) : condition.attributeType === 'date' && selectedDateAttributes && selectedDateAttributes.length > 0 ? (
                            <>
                              {/* Choix entre valeur fixe et attribut pour les dates */}
                              <div className="mb-1 flex gap-2">
                                <button
                                  onClick={() => updateCondition(compartmentIndex, conditionIndex, 'valueType', 'fixed')}
                                  className={`flex-1 rounded px-2 py-1 text-xs ${
                                    (condition.valueType || 'fixed') === 'fixed'
                                      ? 'bg-green-600 text-white'
                                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  Valeur fixe
                                </button>
                                <button
                                  onClick={() => updateCondition(compartmentIndex, conditionIndex, 'valueType', 'attribute')}
                                  className={`flex-1 rounded px-2 py-1 text-xs ${
                                    condition.valueType === 'attribute'
                                      ? 'bg-green-600 text-white'
                                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  Attribut
                                </button>
                              </div>
                              {(condition.valueType || 'fixed') === 'fixed' ? (
                                <input
                                  type="date"
                                  value={condition.value?.toString() || ''}
                                  onChange={(e) => updateCondition(compartmentIndex, conditionIndex, 'value', e.target.value)}
                                  className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                                  placeholder="Valeur"
                                />
                              ) : (
                                <select
                                  value={condition.referenceAttributeId || ''}
                                  onChange={(e) => {
                                    const selectedAttr = selectedDateAttributes.find(attr => attr.id === e.target.value);
                                    if (selectedAttr) {
                                      const newCompartments = [...compartments];
                                      newCompartments[compartmentIndex].conditions[conditionIndex] = {
                                        ...newCompartments[compartmentIndex].conditions[conditionIndex],
                                        referenceAttributeId: selectedAttr.id,
                                        referenceAttributeName: selectedAttr.columnName || selectedAttr.name,
                                        value: selectedAttr.id,
                                        valueType: 'attribute',
                                      };
                                      setCompartments(newCompartments);
                                    }
                                  }}
                                  className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                                >
                                  <option value="">Sélectionner un attribut</option>
                                  {selectedDateAttributes.map((attr) => (
                                    <option key={attr.id} value={attr.id}>
                                      {attr.columnName || attr.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </>
                          ) : (
                            <input
                              type={condition.attributeType === 'number' ? 'number' : condition.attributeType === 'date' ? 'date' : 'text'}
                              value={condition.value?.toString() || ''}
                              onChange={(e) => updateCondition(compartmentIndex, conditionIndex, 'value', parseValue(condition, e.target.value))}
                              className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                              placeholder="Valeur"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeConditionFromCompartment(compartmentIndex, conditionIndex)}
                      className="mt-6 rounded p-1 text-red-600 hover:bg-red-50"
                      title="Supprimer la condition"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addConditionToCompartment(compartmentIndex)}
                className="mt-3 flex items-center gap-1 rounded border border-dashed border-gray-400 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Plus className="size-4" />
                Ajouter une condition
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addCompartment}
          className="mt-4 flex items-center gap-1 rounded border border-dashed border-green-400 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
        >
          <Plus className="size-4" />
          Ajouter un compartiment
        </button>

        <div className="mt-6 flex justify-between gap-2">
          {hasActiveCompartments && (
            <button
              onClick={handleRemoveAllCompartments}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Retirer tous les compartiments
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
