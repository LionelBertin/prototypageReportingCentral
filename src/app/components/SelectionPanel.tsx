import { X, Filter, Calendar, Edit2, Layers, MoreHorizontal } from 'lucide-react';
import { SelectedAttribute } from '../types/selection';
import { useState } from 'react';
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
  onEditCompartment: (id: string) => void;
  onEditDateReference: (id: string) => void;
  onEditConditionalColumn: (id: string) => void;
  onEditCalculatedColumn: (id: string) => void;
  onEditAggregation: (id: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onEditColumnName: (id: string, newName: string) => void;
  getDateAttributeName: (attributeId: string) => string;
  showCompartmenting: boolean;
  showConditionalColumns: boolean;
  showCalculatedColumns: boolean;
  showColumnRename: boolean;
  filterInvolvedAttributeIds?: string[];
}

export function SelectionPanel({
  selectedAttributes,
  onRemoveAttribute,
  onEditCompartment,
  onEditDateReference,
  onEditConditionalColumn,
  onEditCalculatedColumn,
  onEditAggregation,
  onReorder,
  onEditColumnName,
  getDateAttributeName,
  showCompartmenting,
  showConditionalColumns,
  showCalculatedColumns,
  showColumnRename,
  filterInvolvedAttributeIds = [],
}: SelectionPanelProps) {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleStartEdit = (attr: SelectedAttribute) => {
    if (!showColumnRename) return;
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
    if (parts.length >= 3) {
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

  const getOperationDetailLabel = (attr: SelectedAttribute): string => {
    if (attr.insertionType === 'first') {
      const sortAttributeName = getAttributeNameFromId(attr.sortAttributeId);
      return sortAttributeName
        ? `Première instance sur "${sortAttributeName}"`
        : 'Première instance';
    }
    if (attr.insertionType === 'last') {
      const sortAttributeName = getAttributeNameFromId(attr.sortAttributeId);
      return sortAttributeName
        ? `Dernière instance sur "${sortAttributeName}"`
        : 'Dernière instance';
    }
    return getAggregationDetailLabel(attr);
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

    const navigationPath = attr.navigationPath ?? [];

    if (navigationPath.length === 0) {
      return attr.objectName;
    }

    const firstStep = navigationPath[0];
    const rootRelationLabel = firstStep.relationLabel?.trim() || firstStep.objectName?.trim() || attr.objectName;

    if (navigationPath.length === 1) {
      // Un seul saut : "Bénéficiaire", "Approbateur", etc.
      return rootRelationLabel;
    }

    // Plusieurs sauts : montrer l'objet source + le contexte racine
    // ex: "Matricules et Login – Approbateur"
    return `${attr.objectName} – ${rootRelationLabel}`;
  };

  return (
    <div className="h-full overflow-y-auto bg-white p-4">
      {selectedAttributes.length === 0 ? (
        <p className="text-sm text-gray-500">
          Cliquez sur un attribut dans la structure pour le sélectionner.
        </p>
      ) : (
        <div className="space-y-2">
          {selectedAttributes.map((attr, index) => {
            const isDragged = draggedId === attr.id;
            const isFilterInvolved = filterInvolvedAttributeIds.includes(attr.id);

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
                                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                                  {index + 1}
                                </div>
                                {editingColumnId === attr.id && showColumnRename ? (
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
                                      {`${getDisplayColumnName(attr)} – ${getObjectGroupTitle(attr)}`}
                                    </span>
                                    {isFilterInvolved && (
                                      <Filter className="size-3 text-orange-600" title="Utilisé dans le filtrage" />
                                    )}
                                    {showColumnRename && (
                                      <button
                                        onClick={() => handleStartEdit(attr)}
                                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                        title="Éditer le nom de la colonne"
                                      >
                                        <Edit2 className="size-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {attr.insertionType !== 'normal'
                                  && attr.insertionType !== 'aggregation'
                                  && !(attr.insertionType === 'conditional' && !showConditionalColumns)
                                  && !(attr.insertionType === 'calculated' && !showCalculatedColumns) && (
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

                                {['first', 'last', 'aggregation'].includes(attr.insertionType) && (
                                  <button
                                    onClick={() => onEditAggregation(attr.id)}
                                    className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200"
                                    title="Modifier la configuration de l'opération"
                                  >
                                    {getOperationDetailLabel(attr)}
                                  </button>
                                )}

                                {attr.insertionType === 'applicable' && (
                                  <button
                                    onClick={() => onEditDateReference(attr.id)}
                                    className="flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-200"
                                    title={getDateReferenceLabel(attr)}
                                  >
                                    <Calendar className="size-3" />
                                  </button>
                                )}

                              </div>

                              {showCompartmenting && attr.compartmentConfig && attr.compartmentConfig.compartments.length > 0 && (
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

                              {showConditionalColumns && attr.insertionType === 'conditional' && attr.conditionalConfig && (
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

                              {showCalculatedColumns && attr.insertionType === 'calculated' && attr.calculatedConfig && (
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
                            <span className="mr-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                              {getAttributeTypeLabel(attr)}
                            </span>
                            {showCompartmenting && attr.insertionType !== 'applicable' && (
                              <div className="relative">
                                <button
                                  onClick={() => setOpenMenuId((current) => current === attr.id ? null : attr.id)}
                                  className="rounded p-1 hover:bg-gray-200"
                                  title="Actions secondaires"
                                >
                                  <MoreHorizontal className="size-4 text-gray-600" />
                                </button>

                                {openMenuId === attr.id && (
                                  <div className="absolute right-0 top-8 z-10 min-w-44 rounded border border-gray-200 bg-white p-1 shadow-lg">
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        onEditCompartment(attr.id);
                                      }}
                                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                    >
                                      <Layers className="size-3" />
                                      {attr.compartmentConfig && attr.compartmentConfig.compartments.length > 0
                                        ? 'Modifier les compartiments'
                                        : 'Compartimenter'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
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
      )}
    </div>
  );
}