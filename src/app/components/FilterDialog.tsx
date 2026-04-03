import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { AttributeType, DataObject } from '../data/dataStructure';
import { FilterCondition, FilterGroup, SelectedAttribute } from '../types/selection';

interface FilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  attributeName: string;
  attributeType: AttributeType;
  currentFilterGroups?: FilterGroup[];
  onConfirm: (filterGroups?: FilterGroup[]) => void;
  // Pour les agrégations : tous les attributs de l'objet
  objectAttributes?: DataObject['attributes'];
  // Attributs déjà présents dans le rapport, utilisables en comparaison si même type
  selectedFilterAttributes?: Array<{ id: string; name: string; columnName?: string; type: AttributeType }>;
  compartmentFilterAttributes?: Array<{ id: string; name: string; values: string[]; sourceAttributeName: string }>;
  showCompartmenting?: boolean;
}

export function FilterDialog({
  isOpen,
  onClose,
  attributeName,
  attributeType,
  currentFilterGroups,
  onConfirm,
  objectAttributes,
  selectedFilterAttributes,
  compartmentFilterAttributes = [],
  showCompartmenting = false,
}: FilterDialogProps) {
  const filterTargets = useMemo(
    () => [
      ...(objectAttributes ?? []).map((attr) => ({
        id: attr.id,
        name: attr.name,
        type: attr.type,
        targetKind: 'native' as const,
      })),
      ...(showCompartmenting
        ? compartmentFilterAttributes.map((attr) => ({
            id: attr.id,
            name: attr.name,
            type: 'string' as AttributeType,
            targetKind: 'compartment' as const,
            values: attr.values,
            sourceAttributeName: attr.sourceAttributeName,
          }))
        : []),
    ],
    [objectAttributes, showCompartmenting, compartmentFilterAttributes]
  );

  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(
    currentFilterGroups && currentFilterGroups.length > 0
      ? currentFilterGroups
      : [{
          conditions: [{
            attributeId: filterTargets[0]?.id ?? '',
            attributeName: attributeName,
            attributeType: filterTargets[0]?.type ?? attributeType,
            operator: 'equals',
            value: '',
            targetKind: filterTargets[0]?.targetKind ?? 'native',
          }],
          logicalOperator: 'ET',
        }]
  );

  useEffect(() => {
    if (isOpen) {
      if (currentFilterGroups && currentFilterGroups.length > 0) {
        setFilterGroups(currentFilterGroups);
      } else {
        setFilterGroups([{
          conditions: [{
            attributeId: filterTargets[0]?.id ?? '',
            attributeName: attributeName,
            attributeType: filterTargets[0]?.type ?? attributeType,
            operator: 'equals',
            value: '',
            targetKind: filterTargets[0]?.targetKind ?? 'native',
          }],
          logicalOperator: 'ET',
        }]);
      }
    }
  }, [isOpen, currentFilterGroups, attributeName, attributeType, filterTargets]);

  if (!isOpen) return null;

  const getAvailableOperators = (attrType: AttributeType): Array<{ value: FilterCondition['operator']; label: string }> => {
    const common = [
      { value: 'equals' as const, label: 'Égal à' },
      { value: 'notEquals' as const, label: 'Différent de' },
    ];

    if (attrType === 'string') {
      return [
        ...common,
        { value: 'contains' as const, label: 'Contient' },
        { value: 'startsWith' as const, label: 'Commence par' },
        { value: 'endsWith' as const, label: 'Termine par' },
        { value: 'isEmpty' as const, label: 'Vide' },
        { value: 'isNotEmpty' as const, label: 'Renseignée' },
        { value: 'in' as const, label: 'Appartient à' },
      ];
    }

    if (attrType === 'number') {
      return [
        ...common,
        { value: 'greaterThan' as const, label: 'Supérieur à' },
        { value: 'lessThan' as const, label: 'Inférieur à' },
        { value: 'greaterOrEqual' as const, label: 'Supérieur ou égal à' },
        { value: 'lessOrEqual' as const, label: 'Inférieur ou égal à' },
      ];
    }

    if (attrType === 'date') {
      return [
        ...common,
        { value: 'greaterThan' as const, label: 'Après le' },
        { value: 'lessThan' as const, label: 'Avant le' },
        { value: 'greaterOrEqual' as const, label: 'Le ou après le' },
        { value: 'lessOrEqual' as const, label: 'Le ou avant le' },
        { value: 'isEmpty' as const, label: 'Vide' },
        { value: 'isNotEmpty' as const, label: 'Renseignée' },
      ];
    }

    return common;
  };

  const getOperatorLabel = (operator: FilterCondition['operator']): string => {
    const allOperators = [
      { value: 'equals' as const, label: 'Égal à' },
      { value: 'notEquals' as const, label: 'Différent de' },
      { value: 'greaterThan' as const, label: 'Supérieur à' },
      { value: 'lessThan' as const, label: 'Inférieur à' },
      { value: 'greaterOrEqual' as const, label: 'Supérieur ou égal à' },
      { value: 'lessOrEqual' as const, label: 'Inférieur ou égal à' },
      { value: 'contains' as const, label: 'Contient' },
      { value: 'startsWith' as const, label: 'Commence par' },
      { value: 'endsWith' as const, label: 'Termine par' },
      { value: 'isEmpty' as const, label: 'Vide' },
      { value: 'isNotEmpty' as const, label: 'Renseignée' },
      { value: 'in' as const, label: 'in' },
    ];
    return allOperators.find(op => op.value === operator)?.label || operator;
  };

  const addConditionToGroup = (groupIndex: number) => {
    const newGroups = [...filterGroups];
    const selectedAttr = filterTargets[0] || { id: '', name: attributeName, type: attributeType, targetKind: 'native' as const };
    newGroups[groupIndex].conditions.push({
      attributeId: selectedAttr.id,
      attributeName: selectedAttr.name,
      attributeType: selectedAttr.type,
      operator: 'equals',
      value: '',
      targetKind: selectedAttr.targetKind,
      compartmentSourceAttributeId: selectedAttr.targetKind === 'compartment' ? selectedAttr.id : undefined,
      compartmentSourceAttributeName: selectedAttr.targetKind === 'compartment' ? selectedAttr.name : undefined,
    });
    setFilterGroups(newGroups);
  };

  const removeConditionFromGroup = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...filterGroups];
    newGroups[groupIndex].conditions.splice(conditionIndex, 1);
    
    // Si le groupe n'a plus de conditions, le supprimer
    if (newGroups[groupIndex].conditions.length === 0) {
      newGroups.splice(groupIndex, 1);
    }
    
    // S'il n'y a plus de groupes, ajouter un groupe vide
    if (newGroups.length === 0) {
      newGroups.push({
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
    
    setFilterGroups(newGroups);
  };

  const addFilterGroup = () => {
    const selectedAttr = filterTargets[0] || { id: '', name: attributeName, type: attributeType, targetKind: 'native' as const };
    setFilterGroups([
      ...filterGroups,
      {
        conditions: [{
          attributeId: selectedAttr.id,
          attributeName: selectedAttr.name,
          attributeType: selectedAttr.type,
          operator: 'equals',
          value: '',
          targetKind: selectedAttr.targetKind,
          compartmentSourceAttributeId: selectedAttr.targetKind === 'compartment' ? selectedAttr.id : undefined,
          compartmentSourceAttributeName: selectedAttr.targetKind === 'compartment' ? selectedAttr.name : undefined,
        }],
        logicalOperator: 'ET',
      },
    ]);
  };

  const removeFilterGroup = (groupIndex: number) => {
    const newGroups = [...filterGroups];
    newGroups.splice(groupIndex, 1);
    
    // S'il n'y a plus de groupes, ajouter un groupe vide
    if (newGroups.length === 0) {
      newGroups.push({
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
    
    setFilterGroups(newGroups);
  };

  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    field: keyof FilterCondition,
    value: any
  ) => {
    const newGroups = [...filterGroups];
    
    // Si on change l'attribut sélectionné, mettre à jour aussi le type
    if (field === 'attributeId') {
      const selectedAttr = filterTargets.find(attr => attr.id === value);
      if (selectedAttr) {
        newGroups[groupIndex].conditions[conditionIndex].attributeId = selectedAttr.id;
        newGroups[groupIndex].conditions[conditionIndex].attributeName = selectedAttr.name;
        newGroups[groupIndex].conditions[conditionIndex].attributeType = selectedAttr.type;
        newGroups[groupIndex].conditions[conditionIndex].targetKind = selectedAttr.targetKind;
        newGroups[groupIndex].conditions[conditionIndex].compartmentSourceAttributeId = selectedAttr.targetKind === 'compartment' ? selectedAttr.id : undefined;
        newGroups[groupIndex].conditions[conditionIndex].compartmentSourceAttributeName = selectedAttr.targetKind === 'compartment' ? selectedAttr.name : undefined;
        newGroups[groupIndex].conditions[conditionIndex].operator = selectedAttr.targetKind === 'compartment' ? 'in' : 'equals';
        newGroups[groupIndex].conditions[conditionIndex].value = selectedAttr.targetKind === 'compartment' ? [] : '';
        newGroups[groupIndex].conditions[conditionIndex].valueType = 'fixed';
        newGroups[groupIndex].conditions[conditionIndex].referenceAttributeId = undefined;
        newGroups[groupIndex].conditions[conditionIndex].referenceAttributeName = undefined;
      }
    } else {
      (newGroups[groupIndex].conditions[conditionIndex] as any)[field] = value;
    }
    
    setFilterGroups(newGroups);
  };

  const updateGroupOperator = (groupIndex: number, operator: 'ET' | 'OU') => {
    const newGroups = [...filterGroups];
    newGroups[groupIndex].logicalOperator = operator;
    setFilterGroups(newGroups);
  };

  const handleConfirm = () => {
    // Filtrer les groupes qui ont au moins une condition valide
    const validGroups = filterGroups
      .map(group => ({
        ...group,
        conditions: group.conditions.filter(
          // Une condition est valide si:
          // - opérateur vide/renseignée, ou
          // - comparaison à un attribut avec referenceAttributeId renseigné, ou
          // - comparaison à valeur fixe avec valeur renseignée.
          cond => cond.operator === 'isEmpty' ||
                  cond.operator === 'isNotEmpty' ||
                  (cond.valueType === 'attribute' && !!cond.referenceAttributeId) ||
                  ((cond.valueType !== 'attribute') && ((Array.isArray(cond.value) && cond.value.length > 0) || (!Array.isArray(cond.value) && cond.value !== '' && cond.value !== null && cond.value !== undefined)))
        ),
      }))
      .filter(group => group.conditions.length > 0);

    onConfirm(validGroups.length > 0 ? validGroups : undefined);
    onClose();
  };

  const handleRemoveAllFilters = () => {
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

  const hasActiveFilters = currentFilterGroups && currentFilterGroups.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Filtres</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        {hasActiveFilters && (
          <div className="mb-4 rounded border border-orange-200 bg-orange-50 p-3">
            <p className="mb-2 text-sm font-medium text-orange-900">Filtres actifs :</p>
            <div className="space-y-1 text-sm text-orange-800">
              {currentFilterGroups.map((group, gIdx) => (
                <div key={gIdx}>
                  {gIdx > 0 && <div className="my-1 font-bold text-orange-900">OU</div>}
                  <div className="ml-2">
                    {group.conditions.length > 1 && <span>(</span>}
                    {group.conditions.map((cond, cIdx) => (
                      <span key={cIdx}>
                        {cIdx > 0 && <span className="font-semibold text-orange-900"> {group.logicalOperator} </span>}
                        <span className="font-medium">{cond.attributeName}</span> {getOperatorLabel(cond.operator)}
                        {cond.operator !== 'isEmpty' && cond.operator !== 'isNotEmpty' && (
                          cond.valueType === 'attribute' && cond.referenceAttributeName ? (
                            <span> <span className="italic">{cond.referenceAttributeName}</span></span>
                          ) : (
                            <span>
                              {Array.isArray(cond.value)
                                ? ` [${cond.value.join(', ')}]`
                                : ` "${cond.value?.toString()}"`}
                            </span>
                          )
                        )}
                      </span>
                    ))}
                    {group.conditions.length > 1 && <span>)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filterGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="rounded border-2 border-gray-300 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Groupe {groupIndex + 1}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateGroupOperator(groupIndex, 'ET')}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        group.logicalOperator === 'ET'
                          ? 'bg-orange-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      ET
                    </button>
                    <button
                      onClick={() => updateGroupOperator(groupIndex, 'OU')}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        group.logicalOperator === 'OU'
                          ? 'bg-orange-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      OU
                    </button>
                  </div>
                </div>
                {filterGroups.length > 1 && (
                  <button
                    onClick={() => removeFilterGroup(groupIndex)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3" />
                    Supprimer le groupe
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {group.conditions.map((condition, conditionIndex) => (
                  (() => {
                    const comparableAttributes = (selectedFilterAttributes ?? []).filter(
                      (attr) => attr.type === condition.attributeType && condition.targetKind !== 'compartment'
                    );
                    const selectedCompartmentTarget = compartmentFilterAttributes.find((attr) => attr.id === condition.attributeId);

                    return (
                  <div key={conditionIndex} className="flex items-start gap-2">
                    {conditionIndex > 0 && (
                      <div className="flex h-10 items-center rounded bg-orange-100 px-2 text-xs font-semibold text-orange-700">
                        {group.logicalOperator}
                      </div>
                    )}
                    
                    <div className="flex flex-1 gap-2">
                      {/* Sélection de l'attribut (uniquement pour les agrégations) */}
                      {filterTargets.length > 0 && (
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Attribut
                          </label>
                          <select
                            value={condition.attributeId}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, 'attributeId', e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                          >
                            {(objectAttributes ?? []).map((attr) => (
                              <option key={attr.id} value={attr.id}>
                                {attr.name}
                              </option>
                            ))}
                            {showCompartmenting && compartmentFilterAttributes.length > 0 && (
                              <optgroup label="Attributs compartimentés">
                                {compartmentFilterAttributes.map((attr) => (
                                  <option key={attr.id} value={attr.id}>
                                    {attr.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </div>
                      )}

                      {/* Opérateur */}
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Opérateur
                        </label>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(groupIndex, conditionIndex, 'operator', e.target.value)}
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
                          {comparableAttributes.length > 0 && (
                            <>
                              {/* Choix entre valeur fixe et attribut de même type */}
                              <div className="mb-1 flex gap-2">
                                <button
                                  onClick={() => updateCondition(groupIndex, conditionIndex, 'valueType', 'fixed')}
                                  className={`flex-1 rounded px-2 py-1 text-xs ${
                                    (condition.valueType || 'fixed') === 'fixed'
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  Valeur fixe
                                </button>
                                <button
                                  onClick={() => updateCondition(groupIndex, conditionIndex, 'valueType', 'attribute')}
                                  className={`flex-1 rounded px-2 py-1 text-xs ${
                                    condition.valueType === 'attribute'
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  Attribut
                                </button>
                              </div>
                            </>
                          )}

                          {(condition.valueType || 'fixed') === 'attribute' && comparableAttributes.length > 0 ? (
                            <select
                              value={condition.referenceAttributeId || ''}
                              onChange={(e) => {
                                const selectedAttr = comparableAttributes.find(attr => attr.id === e.target.value);
                                if (selectedAttr) {
                                  const newGroups = [...filterGroups];
                                  newGroups[groupIndex].conditions[conditionIndex] = {
                                    ...newGroups[groupIndex].conditions[conditionIndex],
                                    referenceAttributeId: selectedAttr.id,
                                    referenceAttributeName: selectedAttr.columnName || selectedAttr.name,
                                    value: selectedAttr.id,
                                    valueType: 'attribute',
                                  };
                                  setFilterGroups(newGroups);
                                }
                              }}
                              className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                            >
                              <option value="">Sélectionner un attribut</option>
                              {comparableAttributes.map((attr) => (
                                <option key={attr.id} value={attr.id}>
                                  {attr.columnName || attr.name}
                                </option>
                              ))}
                            </select>
                          ) : condition.targetKind === 'compartment' && selectedCompartmentTarget ? (
                            <div className="space-y-1 rounded border border-gray-200 p-2">
                              {selectedCompartmentTarget.values.map((value) => {
                                const currentValues = Array.isArray(condition.value) ? condition.value : [];
                                const checked = currentValues.includes(value);
                                return (
                                  <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const nextValues = checked
                                          ? currentValues.filter((current) => current !== value)
                                          : [...currentValues, value];
                                        updateCondition(groupIndex, conditionIndex, 'value', nextValues);
                                      }}
                                    />
                                    <span>{value}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : condition.attributeType === 'boolean' ? (
                            <select
                              value={condition.value?.toString() || ''}
                              onChange={(e) => updateCondition(groupIndex, conditionIndex, 'value', parseValue(condition, e.target.value))}
                              className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                            >
                              <option value="">Sélectionner</option>
                              <option value="true">Vrai</option>
                              <option value="false">Faux</option>
                            </select>
                          ) : (
                            <input
                              type={condition.attributeType === 'number' ? 'number' : condition.attributeType === 'date' ? 'date' : 'text'}
                              value={condition.value?.toString() || ''}
                              onChange={(e) => updateCondition(groupIndex, conditionIndex, 'value', parseValue(condition, e.target.value))}
                              className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                              placeholder="Valeur"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeConditionFromGroup(groupIndex, conditionIndex)}
                      className="mt-6 rounded p-1 text-red-600 hover:bg-red-50"
                      title="Supprimer la condition"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                    );
                  })()
                ))}
              </div>

              <button
                onClick={() => addConditionToGroup(groupIndex)}
                className="mt-3 flex items-center gap-1 rounded border border-dashed border-gray-400 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Plus className="size-4" />
                Ajouter une condition
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addFilterGroup}
          className="mt-4 flex items-center gap-1 rounded border border-dashed border-blue-400 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
        >
          <Plus className="size-4" />
          Ajouter un groupe (OU)
        </button>

        <div className="mt-6 flex justify-between gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleRemoveAllFilters}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Retirer tous les filtres
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
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}