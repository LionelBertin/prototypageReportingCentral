import { X, Filter, Calendar, Edit2, Layers } from 'lucide-react';
import { SelectedAttribute } from '../types/selection';
import { useMemo, useState } from 'react';
import { dataStructure } from '../data';

const aggregationLabels: Record<string, string> = {
  COUNT: 'Nombre',
  CONCAT: 'Concaténation',
  SUM: 'Somme',
  MIN: 'Minimum',
  MAX: 'Maximum',
  AVG: 'Moyenne',
};

interface SelectionPanelProps {
  selectedAttributes: SelectedAttribute[];
  onRemoveAttribute: (id: string) => void;
  onEditFilter: (id: string) => void;
  onEditCompartment: (id: string) => void;
  onEditDateReference: (id: string) => void;
  onEditConditionalColumn: (id: string) => void;
  onEditCalculatedColumn: (id: string) => void;
  onEditAggregation: (id: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onEditColumnName: (id: string, newName: string) => void;
  getDateAttributeName: (attributeId: string) => string;
}

export function SelectionPanel({
  selectedAttributes,
  onRemoveAttribute,
  onEditFilter,
  onEditCompartment,
  onEditDateReference,
  onEditConditionalColumn,
  onEditCalculatedColumn,
  onEditAggregation,
  onReorder,
  onEditColumnName,
  getDateAttributeName,
}: SelectionPanelProps) {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleStartEdit = (attr: SelectedAttribute) => {
    setEditingColumnId(attr.id);
    setEditingValue(attr.columnName || getDisplayColumnName(attr));
  };

  const handleSaveEdit = (id: string) => {
    onEditColumnName(id, editingValue);
    setEditingColumnId(null);
  };

  const handleCancelEdit = () => {
    setEditingColumnId(null);
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, id: string) => {
    event.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    onReorder(draggedId, targetId);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const getDisplayColumnName = (attr: SelectedAttribute): string => {
    // Si l'utilisateur a défini un nom personnalisé, l'utiliser
    if (attr.columnName) {
      return attr.columnName;
    }

    // Pour les colonnes conditionnelles et calculées, utiliser le nom de la configuration
    if (attr.insertionType === 'conditional' && attr.conditionalConfig) {
      return attr.conditionalConfig.name;
    }
    if (attr.insertionType === 'calculated' && attr.calculatedConfig) {
      return attr.calculatedConfig.name;
    }

    return attr.attributeName;
  };

  const getAttributeNameFromId = (attributeId?: string): string => {
    if (!attributeId) return '';

    const parts = attributeId.split('::');
    if (parts.length === 3) {
      const [themeId, objectId, localAttributeId] = parts;
      const theme = dataStructure.find((candidate) => candidate.id === themeId);
      const dataObject = theme?.objects.find((candidate) => candidate.id === objectId);
      const attribute = dataObject?.attributes.find((candidate) => candidate.id === localAttributeId);
      if (attribute) {
        return attribute.name;
      }
    }

    for (const theme of dataStructure) {
      for (const dataObject of theme.objects) {
        const attribute = dataObject.attributes.find((candidate) => candidate.id === attributeId);
        if (attribute) {
          return attribute.name;
        }
      }
    }

    return attributeId;
  };

  const getAggregationDetailLabel = (attr: SelectedAttribute): string => {
    const aggregationLabel = attr.aggregationType ? aggregationLabels[attr.aggregationType] : 'Agrégation';

    if (!attr.attributeName) {
      return aggregationLabel;
    }

    if (attr.aggregationType === 'CONCAT' && attr.sortAttributeId) {
      const sortAttributeName = getAttributeNameFromId(attr.sortAttributeId);
      return `${aggregationLabel} de "${attr.attributeName}" trié par "${sortAttributeName}"`;
    }

    return `${aggregationLabel} de "${attr.attributeName}"`;
  };

  const getAttributeTypeLabel = (attr: SelectedAttribute) => {
    switch (attr.attributeType) {
      case 'string':
        return 'Texte';
      case 'date':
        return 'Date';
      case 'number':
        return 'Nombre';
      case 'boolean':
        return 'Booléen';
      case 'document':
        return 'Fichier';
      default:
        return attr.attributeType;
    }
  };

  const getDateReferenceLabel = (attr: SelectedAttribute) => {
    if (!attr.dateReference) return 'Date du jour';
    switch (attr.dateReference.type) {
      case 'today':
        return 'Date du jour';
      case 'custom':
        return `Date: ${attr.dateReference.customDate}`;
      case 'attribute': {
        const refAttrName = getDateAttributeName(attr.dateReference.attributeId || '');
        return refAttrName ? `Référence: ${refAttrName}` : 'Attribut de référence';
      }
      default:
        return 'Non défini';
    }
  };

  const getFilterLabel = (filterGroups: SelectedAttribute['filterGroups']) => {
    if (!filterGroups || filterGroups.length === 0) return '';
    
    const operatorLabels: Record<string, string> = {
      'equals': '=',
      'notEquals': '≠',
      'greaterThan': '>',
      'lessThan': '<',
      'greaterOrEqual': '≥',
      'lessOrEqual': '≤',
      'contains': '⊃',
      'startsWith': '⊃..',
      'endsWith': '..⊂',
    };
    
    // Afficher un résumé compact
    const totalConditions = filterGroups.reduce((sum, group) => sum + group.conditions.length, 0);
    if (totalConditions === 1) {
      const cond = filterGroups[0].conditions[0];
      const opLabel = operatorLabels[cond.operator] || cond.operator;
      if (cond.operator === 'isEmpty' || cond.operator === 'isNotEmpty') {
        return `${opLabel}`;
      }
      if (cond.valueType === 'attribute' && cond.referenceAttributeName) {
        return `${opLabel} ${cond.referenceAttributeName}`;
      }
      return `${opLabel} ${cond.value}`;
    }
    
    return `${filterGroups.length} groupe${filterGroups.length > 1 ? 's' : ''} (${totalConditions} condition${totalConditions > 1 ? 's' : ''})`;
  };

  const getOperatorLabel = (operator: string) => {
    const operatorLabels: Record<string, string> = {
      'equals': '=',
      'notEquals': '≠',
      'greaterThan': '>',
      'lessThan': '<',
      'greaterOrEqual': '≥',
      'lessOrEqual': '≤',
      'contains': '⊃',
      'startsWith': '⊃..',
      'endsWith': '..⊂',
    };
    return operatorLabels[operator] || operator;
  };

  const getObjectInstanceKey = (attr: SelectedAttribute) => {
    if (attr.insertionType === 'conditional' || attr.insertionType === 'calculated') {
      return `${attr.insertionType}|${attr.id}`;
    }

    const path = attr.navigationPath
      ?.map((item) => `${item.objectName}:${item.cardinalityName ?? ''}:${item.relationLabel ?? ''}:${item.sourceObjectName ?? ''}`)
      .join('>') ?? '';

    return [
      attr.themeId,
      attr.objectId,
      path,
      attr.insertionType,
      attr.sortAttributeId ?? '',
      attr.sortDirection ?? '',
      attr.aggregationType ?? '',
    ].join('|');
  };

  const getObjectGroupTitle = (attr: SelectedAttribute) => {
    if (attr.insertionType === 'conditional' || attr.insertionType === 'calculated') {
      return getDisplayColumnName(attr);
    }

    const linkedObjectName = attr.navigationPath
      ?.map((item) => item.objectName?.trim())
      .filter((value): value is string => !!value)
      .at(-1);

    if (linkedObjectName) {
      return linkedObjectName;
    }

    return attr.objectName;
  };

  const groupedAttributes = useMemo(() => {
    const groups: Array<{ key: string; representative: SelectedAttribute; attributes: SelectedAttribute[] }> = [];
    const groupMap = new Map<string, { key: string; representative: SelectedAttribute; attributes: SelectedAttribute[] }>();

    for (const attr of selectedAttributes) {
      const key = getObjectInstanceKey(attr);
      const existing = groupMap.get(key);

      if (existing) {
        existing.attributes.push(attr);
        continue;
      }

      const group = {
        key,
        representative: attr,
        attributes: [attr],
      };

      groupMap.set(key, group);
      groups.push(group);
    }

    return groups;
  }, [selectedAttributes]);

  return (
    <div className="h-full overflow-y-auto bg-white p-4">
      <h2 className="mb-4 font-semibold text-gray-900">Attributs sélectionnés</h2>

      {selectedAttributes.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun attribut sélectionné. Cliquez sur un attribut dans la structure pour l'ajouter.
        </p>
      ) : (
        <div className="space-y-3">
          {groupedAttributes.map((group, groupIndex) => {
            const groupFilter = group.representative.filterGroups;
            const showGroupFilter = group.representative.insertionType !== 'applicable';

            return (
              <div key={group.key} className="rounded-lg border border-gray-200 bg-gray-50">
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                        {groupIndex + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {getObjectGroupTitle(group.representative)}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            {group.attributes.length} attribut{group.attributes.length > 1 ? 's' : ''}
                          </span>
                          <span className={`rounded px-2 py-0.5 text-xs ${
                            group.representative.insertionType === 'normal'
                              ? 'bg-gray-100 text-gray-700'
                              : group.representative.insertionType === 'first'
                              ? 'bg-green-100 text-green-700'
                              : group.representative.insertionType === 'last'
                              ? 'bg-yellow-100 text-yellow-700'
                              : group.representative.insertionType === 'aggregation'
                              ? 'bg-purple-100 text-purple-700'
                              : group.representative.insertionType === 'applicable'
                              ? 'bg-indigo-100 text-indigo-700'
                              : group.representative.insertionType === 'conditional'
                              ? 'bg-purple-100 text-purple-700'
                              : group.representative.insertionType === 'calculated'
                              ? 'bg-teal-100 text-teal-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {group.representative.insertionType === 'normal'
                              ? 'Liste détaillée'
                              : group.representative.insertionType === 'first'
                              ? 'Première instance'
                              : group.representative.insertionType === 'last'
                              ? 'Dernière instance'
                              : group.representative.insertionType === 'aggregation'
                              ? getAggregationDetailLabel(group.representative)
                              : group.representative.insertionType === 'applicable'
                              ? 'Instance applicable'
                              : group.representative.insertionType === 'conditional'
                              ? 'Colonne conditionnelle'
                              : group.representative.insertionType === 'calculated'
                              ? 'Colonne calculée'
                              : group.representative.insertionType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {showGroupFilter && (
                      <button
                        onClick={() => onEditFilter(group.representative.id)}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                          groupFilter && groupFilter.length > 0
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title={groupFilter && groupFilter.length > 0 ? 'Modifier le filtre appliqué à tous les attributs de cet objet' : 'Ajouter un filtre pour tous les attributs de cet objet'}
                      >
                        <Filter className="size-3" />
                        {groupFilter && groupFilter.length > 0 ? getFilterLabel(groupFilter) : 'Filtrer l\'objet'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 p-3">
                  {group.attributes.map((attr) => {
                    const isDragged = draggedId === attr.id;

                    return (
                      <div
                        key={attr.id}
                        draggable={editingColumnId !== attr.id}
                        onDragStart={() => handleDragStart(attr.id)}
                        onDragOver={(event) => handleDragOver(event, attr.id)}
                        onDrop={() => handleDrop(attr.id)}
                        onDragEnd={handleDragEnd}
                        className={`rounded-lg border border-gray-200 bg-white p-3 transition ${
                          isDragged ? 'cursor-grabbing opacity-60' : 'cursor-grab'
                        } ${dragOverId === attr.id ? 'border-blue-400 ring-1 ring-blue-200' : ''}`}
                        title="Glissez-déposez pour réordonner"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-1 flex-col">
                              <div className="flex items-center gap-2">
                                {editingColumnId === attr.id ? (
                                  <div className="flex flex-1 items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit(attr.id);
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                      className="flex-1 rounded border border-blue-500 px-2 py-1 text-sm"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveEdit(attr.id)}
                                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="flex-1 text-sm font-medium text-gray-900">
                                      {getDisplayColumnName(attr)}
                                    </span>
                                    <button
                                      onClick={() => handleStartEdit(attr)}
                                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                      title="Éditer le nom de la colonne"
                                    >
                                      <Edit2 className="size-3" />
                                    </button>
                                  </>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {attr.insertionType === 'aggregation' ? (
                                  <button
                                    onClick={() => onEditAggregation(attr.id)}
                                    className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-200"
                                    title="Consulter et modifier la configuration d'agrégation"
                                  >
                                    {getAggregationDetailLabel(attr)}
                                  </button>
                                ) : (
                                  <span className={`rounded px-2 py-0.5 text-xs ${
                                    attr.insertionType === 'normal'
                                      ? 'bg-gray-100 text-gray-700'
                                      : attr.insertionType === 'first'
                                      ? 'bg-green-100 text-green-700'
                                      : attr.insertionType === 'last'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : attr.insertionType === 'applicable'
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : attr.insertionType === 'conditional'
                                      ? 'bg-purple-100 text-purple-700'
                                      : attr.insertionType === 'calculated'
                                      ? 'bg-teal-100 text-teal-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {attr.insertionType === 'normal'
                                      ? getAttributeTypeLabel(attr)
                                      : attr.insertionType === 'first'
                                      ? 'Première instance'
                                      : attr.insertionType === 'last'
                                      ? 'Dernière instance'
                                      : attr.insertionType === 'applicable'
                                      ? 'Instance applicable'
                                      : attr.insertionType === 'conditional'
                                      ? '📊 Colonne conditionnelle'
                                      : attr.insertionType === 'calculated'
                                      ? '🧮 Colonne calculée'
                                      : attr.insertionType}
                                  </span>
                                )}

                                {attr.isApplicable && (
                                  <button
                                    onClick={() => onEditDateReference(attr.id)}
                                    className="flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-200"
                                  >
                                    <Calendar className="size-3" />
                                    {getDateReferenceLabel(attr)}
                                  </button>
                                )}

                                {attr.insertionType !== 'applicable' && (
                                  <button
                                    onClick={() => onEditCompartment(attr.id)}
                                    className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
                                      attr.compartmentConfig && attr.compartmentConfig.compartments.length > 0
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                    title={attr.compartmentConfig && attr.compartmentConfig.compartments.length > 0 ? 'Modifier les compartiments' : 'Ajouter des compartiments'}
                                  >
                                    <Layers className="size-3" />
                                    {attr.compartmentConfig && attr.compartmentConfig.compartments.length > 0 ? `${attr.compartmentConfig.compartments.length} compartiment${attr.compartmentConfig.compartments.length > 1 ? 's' : ''}` : 'Compartimenter'}
                                  </button>
                                )}
                              </div>

                              {attr.compartmentConfig && attr.compartmentConfig.compartments.length > 0 && (
                                <div className="mt-2 rounded bg-green-50 p-2 text-xs text-green-900">
                                  <div className="mb-1 font-semibold">Compartiments actifs :</div>
                                  <div className="space-y-1">
                                    {attr.compartmentConfig.compartments.map((comp, idx) => (
                                      <div key={idx} className="ml-2">
                                        <span className="font-bold">&quot;{comp.name}&quot;</span> si{' '}
                                        {comp.conditions.length > 1 && <span>(</span>}
                                        {comp.conditions.map((cond, cIdx) => (
                                          <span key={cIdx}>
                                            {cIdx > 0 && <span className="font-semibold text-green-700"> {comp.logicalOperator} </span>}
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

                              {attr.insertionType === 'conditional' && attr.conditionalConfig && (
                                <div className="mt-2 rounded bg-purple-50 p-2 text-xs text-purple-900">
                                  <div className="mb-1 font-semibold">Conditions :</div>
                                  <div className="space-y-1">
                                    {attr.conditionalConfig.groups.map((group, gIdx) => (
                                      <div key={gIdx}>
                                        {gIdx > 0 && <div className="my-1 font-bold text-purple-700">OU</div>}
                                        <div className="ml-2">
                                          {group.expressions.length > 1 && <span>(</span>}
                                          {group.expressions.map((expr, eIdx) => (
                                            <span key={eIdx}>
                                              {eIdx > 0 && <span className="font-semibold text-purple-700"> {group.logicalOperator} </span>}
                                              <span className="font-medium">{expr.leftAttributeName}</span>
                                              {' '}{getOperatorLabel(expr.operator)}{' '}
                                              {expr.operator !== 'isEmpty' && expr.operator !== 'isNotEmpty' && (
                                                expr.comparisonType === 'attribute' && expr.rightAttributeName ? (
                                                  <span className="font-medium italic">{expr.rightAttributeName}</span>
                                                ) : expr.comparisonType === 'value' && expr.rightValue !== undefined ? (
                                                  <span>&quot;{expr.rightValue}&quot;</span>
                                                ) : (
                                                  <span>?</span>
                                                )
                                              )}
                                            </span>
                                          ))}
                                          {group.expressions.length > 1 && <span>)</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {attr.insertionType === 'calculated' && attr.calculatedConfig && (
                                <div className="mt-2 rounded bg-teal-50 p-2 text-xs text-teal-900">
                                  <div className="mb-1 font-semibold">Formule :</div>
                                  <div className="ml-2 font-mono">
                                    {attr.calculatedConfig.operator === 'not' ? (
                                      <>
                                        <span className="font-bold">NON</span> <span className="font-medium">{attr.calculatedConfig.leftOperand.columnName}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-medium">{attr.calculatedConfig.leftOperand.columnName}</span>
                                        {' '}
                                        <span className="font-bold">
                                          {attr.calculatedConfig.operator === 'add' && '+'}
                                          {attr.calculatedConfig.operator === 'subtract' && '-'}
                                          {attr.calculatedConfig.operator === 'multiply' && '×'}
                                          {attr.calculatedConfig.operator === 'divide' && '÷'}
                                          {attr.calculatedConfig.operator === 'and' && 'ET'}
                                          {attr.calculatedConfig.operator === 'or' && 'OU'}
                                          {attr.calculatedConfig.operator === 'date_diff' && '-'}
                                        </span>
                                        {' '}
                                        <span className="font-medium">{attr.calculatedConfig.rightOperand?.columnName}</span>
                                        {attr.calculatedConfig.operator === 'date_diff' && <span className="ml-1 text-teal-700">(en jours)</span>}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="ml-2 flex items-center">
                            <button
                              onClick={() => onRemoveAttribute(attr.id)}
                              className="rounded p-1 hover:bg-gray-200"
                              title="Retirer"
                            >
                              <X className="size-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}