import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { ConditionalExpression, ConditionalGroup, ConditionalColumnConfig } from '../types/selection';

interface ConditionalColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: Array<{ id: string; name: string; type: string }>;
  currentConfig?: ConditionalColumnConfig;
  onConfirm: (config: ConditionalColumnConfig) => void;
}

export function ConditionalColumnDialog({
  isOpen,
  onClose,
  availableColumns,
  currentConfig,
  onConfirm,
}: ConditionalColumnDialogProps) {
  const [columnName, setColumnName] = useState(currentConfig?.name || '');
  const [groups, setGroups] = useState<ConditionalGroup[]>(
    currentConfig && currentConfig.groups.length > 0
      ? currentConfig.groups
      : [{
          expressions: [{
            leftAttributeId: '',
            leftAttributeName: '',
            operator: 'equals',
            comparisonType: 'attribute',
          }],
          logicalOperator: 'ET',
        }]
  );

  useEffect(() => {
    if (isOpen) {
      if (currentConfig) {
        setColumnName(currentConfig.name);
        setGroups(currentConfig.groups);
      } else {
        setColumnName('');
        setGroups([{
          expressions: [{
            leftAttributeId: '',
            leftAttributeName: '',
            operator: 'equals',
            comparisonType: 'attribute',
          }],
          logicalOperator: 'ET',
        }]);
      }
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const getAvailableOperators = (): Array<{ value: ConditionalExpression['operator']; label: string }> => {
    return [
      { value: 'equals', label: 'Égal à' },
      { value: 'notEquals', label: 'Différent de' },
      { value: 'greaterThan', label: 'Supérieur à' },
      { value: 'lessThan', label: 'Inférieur à' },
      { value: 'greaterOrEqual', label: 'Supérieur ou égal à' },
      { value: 'lessOrEqual', label: 'Inférieur ou égal à' },
      { value: 'isEmpty', label: 'Vide' },
      { value: 'isNotEmpty', label: 'Renseignée' },
    ];
  };

  const getOperatorSymbol = (operator: ConditionalExpression['operator']): string => {
    const operators = {
      equals: '=',
      notEquals: '≠',
      greaterThan: '>',
      lessThan: '<',
      greaterOrEqual: '≥',
      lessOrEqual: '≤',
      isEmpty: 'vide',
      isNotEmpty: 'renseignée',
    };
    return operators[operator] || operator;
  };

  const addExpressionToGroup = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].expressions.push({
      leftAttributeId: '',
      leftAttributeName: '',
      operator: 'equals',
      comparisonType: 'attribute',
    });
    setGroups(newGroups);
  };

  const removeExpressionFromGroup = (groupIndex: number, expressionIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].expressions.splice(expressionIndex, 1);
    
    // Si le groupe n'a plus d'expressions, le supprimer
    if (newGroups[groupIndex].expressions.length === 0) {
      newGroups.splice(groupIndex, 1);
    }
    
    // S'il n'y a plus de groupes, ajouter un groupe vide
    if (newGroups.length === 0) {
      newGroups.push({
        expressions: [{
          leftAttributeId: '',
          leftAttributeName: '',
          operator: 'equals',
          comparisonType: 'attribute',
        }],
        logicalOperator: 'ET',
      });
    }
    
    setGroups(newGroups);
  };

  const addGroup = () => {
    setGroups([
      ...groups,
      {
        expressions: [{
          leftAttributeId: '',
          leftAttributeName: '',
          operator: 'equals',
          comparisonType: 'attribute',
        }],
        logicalOperator: 'ET',
      },
    ]);
  };

  const removeGroup = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups.splice(groupIndex, 1);
    
    // S'il n'y a plus de groupes, ajouter un groupe vide
    if (newGroups.length === 0) {
      newGroups.push({
        expressions: [{
          leftAttributeId: '',
          leftAttributeName: '',
          operator: 'equals',
          comparisonType: 'attribute',
        }],
        logicalOperator: 'ET',
      });
    }
    
    setGroups(newGroups);
  };

  const updateExpression = (
    groupIndex: number,
    expressionIndex: number,
    field: keyof ConditionalExpression,
    value: any
  ) => {
    const newGroups = [...groups];
    (newGroups[groupIndex].expressions[expressionIndex] as any)[field] = value;
    setGroups(newGroups);
  };

  const updateLeftAttribute = (groupIndex: number, expressionIndex: number, attributeId: string) => {
    const selectedAttr = availableColumns.find(col => col.id === attributeId);
    if (selectedAttr) {
      const newGroups = [...groups];
      newGroups[groupIndex].expressions[expressionIndex].leftAttributeId = selectedAttr.id;
      newGroups[groupIndex].expressions[expressionIndex].leftAttributeName = selectedAttr.name;
      setGroups(newGroups);
    }
  };

  const updateRightAttribute = (groupIndex: number, expressionIndex: number, attributeId: string) => {
    const selectedAttr = availableColumns.find(col => col.id === attributeId);
    if (selectedAttr) {
      const newGroups = [...groups];
      newGroups[groupIndex].expressions[expressionIndex].rightAttributeId = selectedAttr.id;
      newGroups[groupIndex].expressions[expressionIndex].rightAttributeName = selectedAttr.name;
      newGroups[groupIndex].expressions[expressionIndex].comparisonType = 'attribute';
      setGroups(newGroups);
    }
  };

  const updateGroupOperator = (groupIndex: number, operator: 'ET' | 'OU') => {
    const newGroups = [...groups];
    newGroups[groupIndex].logicalOperator = operator;
    setGroups(newGroups);
  };

  const handleConfirm = () => {
    if (!columnName.trim()) {
      alert('Veuillez donner un nom à la colonne conditionnelle');
      return;
    }

    // Filtrer les groupes qui ont au moins une expression valide
    const validGroups = groups
      .map(group => ({
        ...group,
        expressions: group.expressions.filter(
          expr => expr.leftAttributeId !== '' && 
                  (expr.operator === 'isEmpty' || expr.operator === 'isNotEmpty' || 
                   (expr.comparisonType === 'attribute' && expr.rightAttributeId !== '') ||
                   (expr.comparisonType === 'value' && expr.rightValue !== undefined && expr.rightValue !== ''))
        ),
      }))
      .filter(group => group.expressions.length > 0);

    if (validGroups.length === 0) {
      alert('Veuillez configurer au moins une condition valide');
      return;
    }

    onConfirm({
      name: columnName.trim(),
      groups: validGroups,
    });
    onClose();
  };

  const getColumnType = (columnId: string): string => {
    return availableColumns.find(col => col.id === columnId)?.type || 'string';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Nouvelle colonne conditionnelle</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-6 rounded bg-purple-50 p-3 text-sm text-purple-900">
          <p className="font-medium">Fonctionnement :</p>
          <ul className="ml-4 mt-1 list-disc space-y-1">
            <li>Cette colonne affichera <strong>Vrai</strong> ou <strong>Faux</strong> selon les conditions</li>
            <li>Comparez les colonnes déjà sélectionnées entre elles ou avec des valeurs fixes</li>
            <li>Exemple : &quot;Date validation ≥ Date fin&quot; retourne Vrai si la condition est respectée</li>
          </ul>
        </div>

        {/* Nom de la colonne */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nom de la colonne <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Ex: Validation après fin d'absence"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Groupes de conditions */}
        <div className="space-y-4">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="rounded border-2 border-purple-300 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Groupe {groupIndex + 1}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateGroupOperator(groupIndex, 'ET')}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        group.logicalOperator === 'ET'
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      ET
                    </button>
                    <button
                      onClick={() => updateGroupOperator(groupIndex, 'OU')}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        group.logicalOperator === 'OU'
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      OU
                    </button>
                  </div>
                </div>
                {groups.length > 1 && (
                  <button
                    onClick={() => removeGroup(groupIndex)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-3" />
                    Supprimer
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {group.expressions.map((expression, expressionIndex) => (
                  <div key={expressionIndex} className="flex items-start gap-2">
                    {expressionIndex > 0 && (
                      <div className="flex h-10 items-center rounded bg-purple-100 px-2 text-xs font-semibold text-purple-700">
                        {group.logicalOperator}
                      </div>
                    )}
                    
                    <div className="flex flex-1 flex-wrap gap-2">
                      {/* Colonne gauche */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Colonne
                        </label>
                        <select
                          value={expression.leftAttributeId}
                          onChange={(e) => updateLeftAttribute(groupIndex, expressionIndex, e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        >
                          <option value="">Sélectionner</option>
                          {availableColumns.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Opérateur */}
                      <div className="flex-1 min-w-[150px]">
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Opérateur
                        </label>
                        <select
                          value={expression.operator}
                          onChange={(e) => updateExpression(groupIndex, expressionIndex, 'operator', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        >
                          {getAvailableOperators().map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Valeur/Colonne droite */}
                      {expression.operator !== 'isEmpty' && expression.operator !== 'isNotEmpty' && (
                        <div className="flex-1 min-w-[200px]">
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Comparer avec
                          </label>
                          
                          {/* Boutons pour choisir entre colonne et valeur */}
                          <div className="mb-1 flex gap-1">
                            <button
                              onClick={() => updateExpression(groupIndex, expressionIndex, 'comparisonType', 'attribute')}
                              className={`flex-1 rounded px-2 py-1 text-xs ${
                                expression.comparisonType === 'attribute'
                                  ? 'bg-purple-600 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Colonne
                            </button>
                            <button
                              onClick={() => updateExpression(groupIndex, expressionIndex, 'comparisonType', 'value')}
                              className={`flex-1 rounded px-2 py-1 text-xs ${
                                expression.comparisonType === 'value'
                                  ? 'bg-purple-600 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Valeur
                            </button>
                          </div>

                          {expression.comparisonType === 'attribute' ? (
                            <select
                              value={expression.rightAttributeId || ''}
                              onChange={(e) => updateRightAttribute(groupIndex, expressionIndex, e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                            >
                              <option value="">Sélectionner</option>
                              {availableColumns.map((col) => (
                                <option key={col.id} value={col.id}>
                                  {col.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={
                                expression.leftAttributeId && getColumnType(expression.leftAttributeId) === 'number'
                                  ? 'number'
                                  : expression.leftAttributeId && getColumnType(expression.leftAttributeId) === 'date'
                                  ? 'date'
                                  : 'text'
                              }
                              value={expression.rightValue?.toString() || ''}
                              onChange={(e) => {
                                const value = expression.leftAttributeId && getColumnType(expression.leftAttributeId) === 'number'
                                  ? parseFloat(e.target.value)
                                  : e.target.value;
                                updateExpression(groupIndex, expressionIndex, 'rightValue', value);
                              }}
                              className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                              placeholder="Valeur"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeExpressionFromGroup(groupIndex, expressionIndex)}
                      className="mt-6 rounded p-1 text-red-600 hover:bg-red-50"
                      title="Supprimer l'expression"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addExpressionToGroup(groupIndex)}
                className="mt-3 flex items-center gap-1 rounded border border-dashed border-gray-400 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Plus className="size-4" />
                Ajouter une condition
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addGroup}
          className="mt-4 flex items-center gap-1 rounded border border-dashed border-purple-400 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
        >
          <Plus className="size-4" />
          Ajouter un groupe (OU)
        </button>

        {/* Aperçu de la formule */}
        {columnName && groups.some(g => g.expressions.some(e => e.leftAttributeId)) && (
          <div className="mt-4 rounded bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium text-gray-700">Aperçu de la condition :</p>
            <div className="text-sm text-gray-900">
              {groups.map((group, gIdx) => (
                <div key={gIdx}>
                  {gIdx > 0 && <div className="my-1 font-bold text-purple-700">OU</div>}
                  <div className="ml-2">
                    {group.expressions.length > 1 && <span>(</span>}
                    {group.expressions.map((expr, eIdx) => (
                      <span key={eIdx}>
                        {eIdx > 0 && <span className="font-semibold text-purple-700"> {group.logicalOperator} </span>}
                        {expr.leftAttributeName && (
                          <>
                            <span className="font-medium">{expr.leftAttributeName}</span>
                            {' '}{getOperatorSymbol(expr.operator)}{' '}
                            {expr.operator !== 'isEmpty' && expr.operator !== 'isNotEmpty' && (
                              expr.comparisonType === 'attribute' && expr.rightAttributeName ? (
                                <span className="font-medium italic">{expr.rightAttributeName}</span>
                              ) : expr.comparisonType === 'value' && expr.rightValue !== undefined ? (
                                <span>&quot;{expr.rightValue}&quot;</span>
                              ) : (
                                <span className="text-gray-400">?</span>
                              )
                            )}
                          </>
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

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
