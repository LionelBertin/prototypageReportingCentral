import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CalculatedColumnConfig, CalculatedOperator, CalculatedOperand } from '../types/selection';

interface CalculatedColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: Array<{ id: string; name: string; type: string }>;
  currentConfig?: CalculatedColumnConfig;
  onConfirm: (config: CalculatedColumnConfig) => void;
}

export function CalculatedColumnDialog({
  isOpen,
  onClose,
  availableColumns,
  currentConfig,
  onConfirm,
}: CalculatedColumnDialogProps) {
  const [columnName, setColumnName] = useState(currentConfig?.name || '');
  const [leftOperand, setLeftOperand] = useState<CalculatedOperand>(
    currentConfig?.leftOperand || { type: 'column' }
  );
  const [operator, setOperator] = useState<CalculatedOperator>(
    currentConfig?.operator || 'add'
  );
  const [rightOperand, setRightOperand] = useState<CalculatedOperand>(
    currentConfig?.rightOperand || { type: 'column' }
  );
  const [resultType, setResultType] = useState<'number' | 'boolean'>(
    currentConfig?.resultType || 'number'
  );

  useEffect(() => {
    if (isOpen) {
      if (currentConfig) {
        setColumnName(currentConfig.name);
        setLeftOperand(currentConfig.leftOperand);
        setOperator(currentConfig.operator);
        setRightOperand(currentConfig.rightOperand || { type: 'column' });
        setResultType(currentConfig.resultType);
      } else {
        setColumnName('');
        setLeftOperand({ type: 'column' });
        setOperator('add');
        setRightOperand({ type: 'column' });
        setResultType('number');
      }
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const getOperatorLabel = (op: CalculatedOperator): string => {
    const labels: Record<CalculatedOperator, string> = {
      add: '+',
      subtract: '-',
      multiply: '×',
      divide: '÷',
      and: 'ET',
      or: 'OU',
      not: 'NON',
      date_diff: 'Différence (jours)',
    };
    return labels[op];
  };

  const getAvailableOperators = (): CalculatedOperator[] => {
    if (!leftOperand.columnId && leftOperand.type === 'column') {
      // Aucune colonne sélectionnée, retourner tous les opérateurs
      return ['add', 'subtract', 'multiply', 'divide', 'and', 'or', 'not', 'date_diff'];
    }

    const leftColumn = availableColumns.find(col => col.id === leftOperand.columnId);
    if (!leftColumn) return [];

    // Déterminer les opérateurs selon le type de la colonne gauche
    if (leftColumn.type === 'number') {
      return ['add', 'subtract', 'multiply', 'divide'];
    } else if (leftColumn.type === 'boolean' || leftColumn.type === 'file') {
      return ['and', 'or', 'not'];
    } else if (leftColumn.type === 'date') {
      return ['date_diff'];
    }

    return [];
  };

  const getCompatibleColumns = (forOperand: 'left' | 'right'): typeof availableColumns => {
    if (forOperand === 'left') {
      // Pour l'opérande gauche, filtrer selon le type de résultat ou tous si pas encore défini
      return availableColumns.filter(col => 
        col.type === 'number' || col.type === 'boolean' || col.type === 'file' || col.type === 'date'
      );
    }

    // Pour l'opérande droit, filtrer selon le type de l'opérande gauche
    if (!leftOperand.columnId) return [];

    const leftColumn = availableColumns.find(col => col.id === leftOperand.columnId);
    if (!leftColumn) return [];

    // Pour NOT, pas besoin d'opérande droit
    if (operator === 'not') return [];

    // Pour les autres opérateurs, même type que l'opérande gauche
    if (leftColumn.type === 'file') {
      // Les fichiers sont traités comme des booléens
      return availableColumns.filter(col => col.type === 'boolean' || col.type === 'file');
    }

    return availableColumns.filter(col => col.type === leftColumn.type);
  };

  const updateLeftOperand = (columnId: string) => {
    const selectedCol = availableColumns.find(col => col.id === columnId);
    if (selectedCol) {
      setLeftOperand({
        type: 'column',
        columnId: selectedCol.id,
        columnName: selectedCol.name,
        columnType: selectedCol.type as any,
      });

      // Réinitialiser l'opérateur si incompatible
      const compatibleOps = getAvailableOperatorsForType(selectedCol.type);
      if (!compatibleOps.includes(operator)) {
        setOperator(compatibleOps[0] || 'add');
      }

      // Réinitialiser l'opérande droit
      setRightOperand({ type: 'column' });

      // Mettre à jour le type de résultat
      if (selectedCol.type === 'boolean' || selectedCol.type === 'file') {
        setResultType('boolean');
      } else if (selectedCol.type === 'number' || selectedCol.type === 'date') {
        setResultType('number');
      }
    }
  };

  const getAvailableOperatorsForType = (type: string): CalculatedOperator[] => {
    if (type === 'number') {
      return ['add', 'subtract', 'multiply', 'divide'];
    } else if (type === 'boolean' || type === 'file') {
      return ['and', 'or', 'not'];
    } else if (type === 'date') {
      return ['date_diff'];
    }
    return [];
  };

  const updateRightOperand = (columnId: string) => {
    const selectedCol = availableColumns.find(col => col.id === columnId);
    if (selectedCol) {
      setRightOperand({
        type: 'column',
        columnId: selectedCol.id,
        columnName: selectedCol.name,
        columnType: selectedCol.type as any,
      });
    }
  };

  const handleOperatorChange = (newOperator: CalculatedOperator) => {
    setOperator(newOperator);
    
    // Si on passe à NOT, vider l'opérande droit
    if (newOperator === 'not') {
      setRightOperand({ type: 'column' });
    }
  };

  const handleConfirm = () => {
    if (!columnName.trim()) {
      alert('Veuillez donner un nom à la colonne calculée');
      return;
    }

    if (!leftOperand.columnId) {
      alert('Veuillez sélectionner la première colonne');
      return;
    }

    if (operator !== 'not' && !rightOperand.columnId && rightOperand.type === 'column') {
      alert('Veuillez sélectionner la deuxième colonne');
      return;
    }

    const config: CalculatedColumnConfig = {
      name: columnName.trim(),
      resultType,
      leftOperand,
      operator,
    };

    // Ajouter rightOperand seulement si l'opérateur n'est pas NOT
    if (operator !== 'not') {
      config.rightOperand = rightOperand;
    }

    onConfirm(config);
    onClose();
  };

  const getFormulaPreview = (): string => {
    if (!leftOperand.columnName) return '';

    const leftText = leftOperand.columnName;
    const opText = getOperatorLabel(operator);

    if (operator === 'not') {
      return `${opText} ${leftText}`;
    }

    const rightText = rightOperand.columnName || '?';
    return `${leftText} ${opText} ${rightText}`;
  };

  const getResultTypeLabel = (): string => {
    if (!leftOperand.columnId) return 'Non défini';

    const leftColumn = availableColumns.find(col => col.id === leftOperand.columnId);
    if (!leftColumn) return 'Non défini';

    if (leftColumn.type === 'number') {
      return 'Nombre';
    } else if (leftColumn.type === 'boolean' || leftColumn.type === 'file') {
      return 'Booléen (Vrai/Faux)';
    } else if (leftColumn.type === 'date') {
      return 'Nombre (jours)';
    }

    return 'Non défini';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Nouvelle colonne calculée</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-6 rounded bg-teal-50 p-3 text-sm text-teal-900">
          <p className="font-medium">Fonctionnement :</p>
          <ul className="ml-4 mt-1 list-disc space-y-1">
            <li><strong>Type numérique</strong> : Addition, soustraction, multiplication, division</li>
            <li><strong>Type date</strong> : Différence en nombre de jours</li>
            <li><strong>Type booléen</strong> : Opérations logiques ET, OU, NON (fichiers = booléens)</li>
          </ul>
        </div>

        {/* Nom de la colonne */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nom de la colonne <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Ex: Total rémunération, Ancienneté en jours"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Formule */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Formule de calcul</label>
          
          <div className="space-y-4">
            {/* Opérande gauche */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Première colonne <span className="text-red-500">*</span>
              </label>
              <select
                value={leftOperand.columnId || ''}
                onChange={(e) => updateLeftOperand(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sélectionner une colonne</option>
                {getCompatibleColumns('left').map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.type === 'file' ? 'fichier (booléen)' : col.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Opérateur */}
            {leftOperand.columnId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Opération <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {getAvailableOperators().map((op) => (
                    <button
                      key={op}
                      onClick={() => handleOperatorChange(op)}
                      className={`rounded px-4 py-2 text-sm font-medium ${
                        operator === op
                          ? 'bg-teal-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {getOperatorLabel(op)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opérande droit */}
            {leftOperand.columnId && operator !== 'not' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Deuxième colonne <span className="text-red-500">*</span>
                </label>
                <select
                  value={rightOperand.columnId || ''}
                  onChange={(e) => updateRightOperand(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner une colonne</option>
                  {getCompatibleColumns('right').map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name} ({col.type === 'file' ? 'fichier (booléen)' : col.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Aperçu */}
        {leftOperand.columnId && (
          <div className="mb-4 rounded bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-700">Aperçu de la formule :</p>
            <div className="rounded bg-white p-3 font-mono text-sm text-gray-900">
              {getFormulaPreview()}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              <strong>Type de résultat :</strong> {getResultTypeLabel()}
            </p>
          </div>
        )}

        {/* Exemples selon le type */}
        {leftOperand.columnId && (
          <div className="mb-4 rounded border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
            <p className="mb-1 font-medium">Exemples d&apos;utilisation :</p>
            {availableColumns.find(col => col.id === leftOperand.columnId)?.type === 'number' && (
              <ul className="ml-4 list-disc space-y-1">
                <li>Salaire + Prime = Total rémunération</li>
                <li>Montant TTC - Montant HT = Montant TVA</li>
                <li>Quantité × Prix unitaire = Total</li>
              </ul>
            )}
            {availableColumns.find(col => col.id === leftOperand.columnId)?.type === 'date' && (
              <ul className="ml-4 list-disc space-y-1">
                <li>Date fin - Date début = Durée en jours</li>
                <li>Date validation - Date demande = Délai de traitement</li>
              </ul>
            )}
            {(availableColumns.find(col => col.id === leftOperand.columnId)?.type === 'boolean' || 
              availableColumns.find(col => col.id === leftOperand.columnId)?.type === 'file') && (
              <ul className="ml-4 list-disc space-y-1">
                <li>Document identité ET Justificatif domicile = Dossier complet</li>
                <li>Actif OU En formation = Disponible</li>
                <li>NON Validé = En attente</li>
              </ul>
            )}
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
            className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
