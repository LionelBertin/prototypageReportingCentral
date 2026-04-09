import { useState, useEffect, useMemo, useRef } from 'react';
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
  const AUTO_FILTER_COLUMN_PREFIX = '__auto-filter-col__';
  const wasOpenRef = useRef(false);

  const normalizeSortKey = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();

  const sortedObjectAttributes = useMemo(
    () => [...(objectAttributes ?? [])].sort((a, b) => normalizeSortKey(a.name).localeCompare(normalizeSortKey(b.name), 'fr')),
    [objectAttributes]
  );

  const sortedCompartmentFilterAttributes = useMemo(
    () => [...compartmentFilterAttributes].sort((a, b) => normalizeSortKey(a.name).localeCompare(normalizeSortKey(b.name), 'fr')),
    [compartmentFilterAttributes]
  );

  const splitGroupedLabel = (value: string) => {
    const separator = ' – ';
    const separatorIndex = value.lastIndexOf(separator);
    if (separatorIndex === -1) {
      return { optionLabel: value, groupLabel: 'Objet courant' };
    }

    return {
      optionLabel: value.slice(0, separatorIndex),
      groupLabel: value.slice(separatorIndex + separator.length),
    };
  };

  const buildOptionGroups = <T extends { id: string; name: string }>(items: T[]) => {
    const groups = new Map<string, Array<T & { optionLabel: string }>>();

    for (const item of items) {
      const { optionLabel, groupLabel } = splitGroupedLabel(item.name);
      const existing = groups.get(groupLabel);
      const nextItem = { ...item, optionLabel };
      if (existing) {
        existing.push(nextItem);
      } else {
        groups.set(groupLabel, [nextItem]);
      }
    }

    return Array.from(groups.entries())
      .map(([label, options]) => ({
        label,
        options: options.sort((a, b) => normalizeSortKey(a.optionLabel).localeCompare(normalizeSortKey(b.optionLabel), 'fr')),
      }))
      .sort((a, b) => normalizeSortKey(a.label).localeCompare(normalizeSortKey(b.label), 'fr'));
  };

  const buildCustomOptionGroups = <T extends { id: string; label: string; group: string }>(items: T[]) => {
    const groups = new Map<string, T[]>();

    for (const item of items) {
      const existing = groups.get(item.group);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(item.group, [item]);
      }
    }

    return Array.from(groups.entries())
      .map(([label, options]) => ({
        label,
        options: options.sort((a, b) => normalizeSortKey(a.label).localeCompare(normalizeSortKey(b.label), 'fr')),
      }))
      .sort((a, b) => normalizeSortKey(a.label).localeCompare(normalizeSortKey(b.label), 'fr'));
  };

  const filterTargets = useMemo(() => {
    const nativeTargets = sortedObjectAttributes.map((attr) => ({
      id: attr.id,
      name: attr.name,
      type: attr.type,
      enumValues: attr.enumValues,
      targetKind: 'native' as const,
    }));

    const compartmentTargets = showCompartmenting
      ? sortedCompartmentFilterAttributes.map((attr) => ({
          id: attr.id,
          name: attr.name,
          type: 'string' as AttributeType,
          targetKind: 'compartment' as const,
          values: attr.values,
          sourceAttributeName: attr.sourceAttributeName,
        }))
      : [];

    const existingTargetIds = new Set([...nativeTargets, ...compartmentTargets].map((target) => target.id));
    const autoFilterTargets = (currentFilterGroups ?? [])
      .flatMap((group) => group.conditions)
      .filter((condition) => condition.attributeId.startsWith(AUTO_FILTER_COLUMN_PREFIX))
      .filter((condition) => !existingTargetIds.has(condition.attributeId))
      .map((condition) => ({
        id: condition.attributeId,
        name: condition.attributeName,
        type: condition.attributeType,
        targetKind: 'native' as const,
      }));

    return [...nativeTargets, ...compartmentTargets, ...autoFilterTargets];
  }, [currentFilterGroups, showCompartmenting, sortedCompartmentFilterAttributes, sortedObjectAttributes]);

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
    const justOpened = isOpen && !wasOpenRef.current;
    if (!justOpened) {
      wasOpenRef.current = isOpen;
      return;
    }

    if (currentFilterGroups && currentFilterGroups.length > 0) {
      const normalizedGroups = currentFilterGroups.map((group) => ({
        ...group,
        conditions: group.conditions.map((condition) => {
          const normalizedAttributeId = condition.attributeId.startsWith(AUTO_FILTER_COLUMN_PREFIX)
            ? condition.attributeId.slice(AUTO_FILTER_COLUMN_PREFIX.length)
            : condition.attributeId;
          const target = filterTargets.find((candidate) => candidate.id === condition.attributeId)
            ?? filterTargets.find((candidate) => candidate.id === normalizedAttributeId);
          const enumValues = target?.targetKind === 'native' ? target.enumValues ?? [] : [];
          const availableOperators = getAvailableOperators(condition.attributeType, enumValues).map((entry) => entry.value);
          const operator = availableOperators.includes(condition.operator)
            ? condition.operator
            : (availableOperators[0] ?? 'equals');
          const targetKind = target?.targetKind ?? condition.targetKind ?? 'native';
          const shouldUseArrayValue = targetKind === 'compartment' || enumValues.length > 0;
          const value = shouldUseArrayValue
            ? (Array.isArray(condition.value)
              ? condition.value
              : (condition.value !== '' && condition.value !== null && condition.value !== undefined
                ? [String(condition.value)]
                : []))
            : condition.value;

          return {
            ...condition,
            attributeName: target?.name ?? condition.attributeName,
            attributeType: target?.type ?? condition.attributeType,
            targetKind,
            operator,
            value,
          };
        }),
      }));

      setFilterGroups(normalizedGroups);
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

    wasOpenRef.current = isOpen;
  }, [isOpen, currentFilterGroups, attributeName, attributeType, filterTargets]);

  if (!isOpen) return null;

  const getConditionEnumValues = (condition: FilterCondition): string[] => {
    if (condition.targetKind === 'compartment') return [];
    const selectedTarget = filterTargets.find((target) => target.id === condition.attributeId && target.targetKind === 'native');
    return selectedTarget?.enumValues ?? [];
  };

  const getAvailableOperators = (
    attrType: AttributeType,
    enumValues?: string[]
  ): Array<{ value: FilterCondition['operator']; label: string }> => {
    if ((enumValues?.length ?? 0) > 0) {
      return [
        { value: 'equals' as const, label: 'Égal à' },
        { value: 'notEquals' as const, label: 'Différent de' },
        { value: 'isEmpty' as const, label: 'Vide' },
        { value: 'isNotEmpty' as const, label: 'Renseignée' },
      ];
    }

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
        const enumValues = selectedAttr.targetKind === 'native' ? selectedAttr.enumValues ?? [] : [];
        const nextOperator: FilterCondition['operator'] = selectedAttr.targetKind === 'compartment'
          ? 'in'
          : (enumValues.length > 0 ? 'equals' : 'equals');
        newGroups[groupIndex].conditions[conditionIndex].attributeId = selectedAttr.id;
        newGroups[groupIndex].conditions[conditionIndex].attributeName = selectedAttr.name;
        newGroups[groupIndex].conditions[conditionIndex].attributeType = selectedAttr.type;
        newGroups[groupIndex].conditions[conditionIndex].targetKind = selectedAttr.targetKind;
        newGroups[groupIndex].conditions[conditionIndex].compartmentSourceAttributeId = selectedAttr.targetKind === 'compartment' ? selectedAttr.id : undefined;
        newGroups[groupIndex].conditions[conditionIndex].compartmentSourceAttributeName = selectedAttr.targetKind === 'compartment' ? selectedAttr.name : undefined;
        newGroups[groupIndex].conditions[conditionIndex].operator = nextOperator;
        newGroups[groupIndex].conditions[conditionIndex].value = (selectedAttr.targetKind === 'compartment' || enumValues.length > 0) ? [] : '';
        newGroups[groupIndex].conditions[conditionIndex].valueType = 'fixed';
        newGroups[groupIndex].conditions[conditionIndex].referenceAttributeId = undefined;
        newGroups[groupIndex].conditions[conditionIndex].referenceAttributeName = undefined;
      }
    } else if (field === 'operator') {
      const currentCondition = newGroups[groupIndex].conditions[conditionIndex];
      const enumValues = getConditionEnumValues(currentCondition);
      const allowedOperators = getAvailableOperators(currentCondition.attributeType, enumValues).map((entry) => entry.value);
      const nextOperator = allowedOperators.includes(value) ? value : allowedOperators[0] ?? 'equals';
      currentCondition.operator = nextOperator;
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

  const hasActiveFilters = !!(currentFilterGroups && currentFilterGroups.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Filtres</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          {filterGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="rounded border-2 border-gray-300 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Groupe {groupIndex + 1}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
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
                      type="button"
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
                    type="button"
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
                    const comparableAttributes = (selectedFilterAttributes ?? [])
                      .filter((attr) => attr.type === condition.attributeType && condition.targetKind !== 'compartment')
                      .sort((a, b) => normalizeSortKey(a.columnName || a.name).localeCompare(normalizeSortKey(b.columnName || b.name), 'fr'));
                    const selectedCompartmentTarget = compartmentFilterAttributes.find((attr) => attr.id === condition.attributeId);
                    const enumValues = getConditionEnumValues(condition);
                    const hasEnumValues = enumValues.length > 0;
                    const availableOperators = getAvailableOperators(condition.attributeType, enumValues);
                    const standardNativeTargets = filterTargets.filter(
                      (target) => target.targetKind === 'native' && !target.id.startsWith(AUTO_FILTER_COLUMN_PREFIX)
                    );
                    const autoNativeTargets = filterTargets.filter(
                      (target) => target.targetKind === 'native' && target.id.startsWith(AUTO_FILTER_COLUMN_PREFIX)
                    );
                    const compartmentTargets = filterTargets.filter((target) => target.targetKind === 'compartment');
                    const standardNativeTargetGroups = buildOptionGroups(standardNativeTargets);
                    const autoNativeTargetGroups = buildCustomOptionGroups(
                      autoNativeTargets.map((target) => {
                        const { optionLabel, groupLabel } = splitGroupedLabel(target.name);
                        return {
                          id: target.id,
                          label: optionLabel,
                          group: `Attributs auto · ${groupLabel}`,
                        };
                      })
                    );
                    const compartmentTargetGroups = buildCustomOptionGroups(
                      compartmentTargets.map((target) => ({
                        id: target.id,
                        label: target.name,
                        group: `Attributs compartimentés · ${target.sourceAttributeName}`,
                      }))
                    );
                    const comparableAttributeGroups = buildOptionGroups(
                      comparableAttributes.map((attr) => ({
                        id: attr.id,
                        name: attr.columnName || attr.name,
                      }))
                    );

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
                            {standardNativeTargetGroups.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map((target) => (
                                  <option key={target.id} value={target.id}>
                                    {target.optionLabel}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                            {autoNativeTargetGroups.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map((target) => (
                                  <option key={target.id} value={target.id}>
                                    {target.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                            {showCompartmenting && compartmentTargetGroups.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map((target) => (
                                  <option key={target.id} value={target.id}>
                                    {target.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
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
                          {availableOperators.map((op) => (
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
                                  type="button"
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
                                  type="button"
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
                              {comparableAttributeGroups.map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                  {group.options.map((attr) => (
                                    <option key={attr.id} value={attr.id}>
                                      {attr.optionLabel}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          ) : hasEnumValues && (condition.valueType || 'fixed') === 'fixed' ? (
                            <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
                              {enumValues.map((value) => {
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
                      type="button"
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
                type="button"
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
          type="button"
          onClick={addFilterGroup}
          className="mt-4 flex items-center gap-1 rounded border border-dashed border-blue-400 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
        >
          <Plus className="size-4" />
          Ajouter un groupe (OU)
        </button>

        <div className="mt-6 flex justify-between gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleRemoveAllFilters}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Retirer tous les filtres
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
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