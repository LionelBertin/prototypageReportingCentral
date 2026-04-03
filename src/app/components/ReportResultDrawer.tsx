import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

type ReportPreviewColumn = {
  id: string;
  label: string;
};

type ReportPreviewRow = Record<string, string | number | boolean | null>;

type DepartmentTreeNode = {
  name: string;
  children: DepartmentTreeNode[];
};

type ReportResultDrawerProps = {
  onBackToConfiguration: () => void;
  mainObjectName: string;
  columns: ReportPreviewColumn[];
  rows: ReportPreviewRow[];
  mainObjectLinkedToCollaborateur: boolean;
  reportDate: string;
  includeDepartedCollaborators: boolean;
  includePresentCollaborators: boolean;
  includeFutureCollaborators: boolean;
  selectedDepartmentFilters: string[];
  selectedEstablishmentFilters: string[];
  departmentTree: DepartmentTreeNode[];
  establishmentOptions: string[];
  onReportDateChange: (value: string) => void;
  onIncludeDepartedChange: (value: boolean) => void;
  onIncludePresentChange: (value: boolean) => void;
  onIncludeFutureChange: (value: boolean) => void;
  onSelectedDepartmentsChange: (next: string[]) => void;
  onSelectedEstablishmentsChange: (next: string[]) => void;
  globalFilterSummaryLines: string[];
  collaboratorGeneratedFilterLines: string[];
  collaboratorStatusSummaryLabel: string;
  onEditGlobalFilters: () => void;
};

function DepartmentTreeItem({
  node,
  level,
  disabled,
  selectedDepartmentFilters,
  onToggle,
  path,
}: {
  node: DepartmentTreeNode;
  level: number;
  disabled: boolean;
  selectedDepartmentFilters: string[];
  onToggle: (node: DepartmentTreeNode, checked: boolean) => void;
  path?: string;
}) {
  const checkboxId = `${path ?? 'drawer-dept'}-${node.name}`;

  return (
    <div>
      <label
        htmlFor={checkboxId}
        className="flex items-center gap-2 whitespace-nowrap"
        style={{ paddingLeft: `${level * 14}px` }}
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={selectedDepartmentFilters.includes(node.name)}
          disabled={disabled}
          onChange={(event) => onToggle(node, event.target.checked)}
        />
        <span className="font-light whitespace-nowrap">{node.name}</span>
      </label>

      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <DepartmentTreeItem
              key={`${checkboxId}-${child.name}`}
              node={child}
              level={level + 1}
              disabled={disabled}
              selectedDepartmentFilters={selectedDepartmentFilters}
              onToggle={onToggle}
              path={checkboxId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const toggleListValue = (values: string[], targetValue: string, shouldCheck: boolean) => {
  const next = new Set(values);
  if (shouldCheck) {
    next.add(targetValue);
  } else {
    next.delete(targetValue);
  }

  return Array.from(next).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
};

export function ReportResultDrawer({
  mainObjectName,
  columns,
  rows,
  mainObjectLinkedToCollaborateur,
  reportDate,
  includeDepartedCollaborators,
  includePresentCollaborators,
  includeFutureCollaborators,
  selectedDepartmentFilters,
  selectedEstablishmentFilters,
  departmentTree,
  establishmentOptions,
  onReportDateChange,
  onIncludeDepartedChange,
  onIncludePresentChange,
  onIncludeFutureChange,
  onSelectedDepartmentsChange,
  onSelectedEstablishmentsChange,
  globalFilterSummaryLines,
  collaboratorGeneratedFilterLines,
  collaboratorStatusSummaryLabel,
  onEditGlobalFilters,
}: ReportResultDrawerProps) {
  const [collaboratorStatusFilterExpanded, setCollaboratorStatusFilterExpanded] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<'model' | 'report' | null>(null);
  const [saveName, setSaveName] = useState('');

  const normalizedMainObjectName = (mainObjectName || 'Rapport').trim();

  const openSaveDialog = (mode: 'model' | 'report') => {
    setSaveDialogMode(mode);
    if (mode === 'model') {
      setSaveName(`Modèle Rapport ${normalizedMainObjectName}`);
      return;
    }
    setSaveName(`Rapport ${normalizedMainObjectName}`);
  };

  const closeSaveDialog = () => {
    setSaveDialogMode(null);
  };

  const saveDialogTitle = saveDialogMode === 'model' ? 'Enregistrer le modèle' : 'Enregistrer ce rapport';
  const saveDialogLabel = saveDialogMode === 'model' ? 'Nom du modèle' : 'Nom du rapport';

  const getDepartmentBranchNames = (node: DepartmentTreeNode): string[] => {
    return [node.name, ...node.children.flatMap(getDepartmentBranchNames)];
  };

  const toggleDepartmentBranch = (node: DepartmentTreeNode, isChecked: boolean) => {
    const branchNames = getDepartmentBranchNames(node);
    const next = new Set(selectedDepartmentFilters);
    for (const name of branchNames) {
      if (isChecked) {
        next.add(name);
      } else {
        next.delete(name);
      }
    }
    onSelectedDepartmentsChange(Array.from(next).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <div className="mx-auto flex min-h-full w-full max-w-full flex-col gap-3 px-4">
            <div className="grid shrink-0 gap-3 lg:grid-cols-2">
              <div className={`rounded border p-3 ${!mainObjectLinkedToCollaborateur ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => setCollaboratorStatusFilterExpanded((prev) => !prev)}
                  className="mb-2 flex w-full items-center justify-between text-left"
                >
                  <span className="flex items-center gap-1 text-sm font-medium text-gray-800">
                    <span className="inline-block w-2">{collaboratorStatusFilterExpanded ? 'v' : '>'}</span>
                    <span>Statuts collaborateurs</span>
                  </span>
                  <span className="text-xs text-gray-600">
                    {mainObjectLinkedToCollaborateur ? collaboratorStatusSummaryLabel : 'Non applicable'}
                  </span>
                </button>

                {collaboratorStatusFilterExpanded && (
                  <div className="space-y-2 border-t border-gray-200 pt-2">
                    {!mainObjectLinkedToCollaborateur && (
                      <div className="text-xs text-gray-600">
                        Aucun lien (même indirect) avec Collaborateur depuis l'objet principal.
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <label htmlFor="preview-report-date" className="font-medium text-gray-700">Date de valeur du rapport</label>
                      <input
                        id="preview-report-date"
                        type="date"
                        value={reportDate}
                        disabled={!mainObjectLinkedToCollaborateur}
                        onChange={(event) => onReportDateChange(event.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={includeDepartedCollaborators}
                          disabled={!mainObjectLinkedToCollaborateur}
                          onChange={(event) => onIncludeDepartedChange(event.target.checked)}
                        />
                        partis
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={includePresentCollaborators}
                          disabled={!mainObjectLinkedToCollaborateur}
                          onChange={(event) => onIncludePresentChange(event.target.checked)}
                        />
                        présents
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={includeFutureCollaborators}
                          disabled={!mainObjectLinkedToCollaborateur}
                          onChange={(event) => onIncludeFutureChange(event.target.checked)}
                        />
                        futurs
                      </label>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1 text-[11px] text-gray-700">
                        <div className="font-medium">Départements</div>
                        <div className="h-24 overflow-auto rounded border border-gray-300 p-2 text-[10px] font-light">
                          {departmentTree.length === 0 ? (
                            <div className="text-gray-500">Aucun département chargé.</div>
                          ) : (
                            <div className="space-y-0.5">
                              {departmentTree.map((rootNode) => (
                                <DepartmentTreeItem
                                  key={rootNode.name}
                                  node={rootNode}
                                  level={0}
                                  disabled={!mainObjectLinkedToCollaborateur}
                                  selectedDepartmentFilters={selectedDepartmentFilters}
                                  onToggle={toggleDepartmentBranch}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] text-gray-700">
                        <div className="font-medium">Etablissements</div>
                        <div className="h-24 overflow-auto rounded border border-gray-300 p-2 text-[10px] font-light">
                          {establishmentOptions.map((establishment) => (
                            <label key={establishment} className="flex items-center gap-2 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedEstablishmentFilters.includes(establishment)}
                                disabled={!mainObjectLinkedToCollaborateur}
                                onChange={(event) => onSelectedEstablishmentsChange(
                                  toggleListValue(selectedEstablishmentFilters, establishment, event.target.checked)
                                )}
                              />
                              <span className="font-light whitespace-nowrap">{establishment}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mainObjectLinkedToCollaborateur && collaboratorGeneratedFilterLines.length > 0 && (
                  <div className="mt-2 rounded border border-orange-200 bg-orange-50 p-2 text-xs text-orange-800">
                    {collaboratorGeneratedFilterLines.map((line, index) => (
                      <div key={index}>• {line}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-gray-800">Filtrage global</div>
                  <button
                    onClick={onEditGlobalFilters}
                    className="rounded border border-orange-300 bg-orange-50 px-2 py-1 text-xs text-orange-700 hover:bg-orange-100"
                  >
                    Modifier
                  </button>
                </div>

                {globalFilterSummaryLines.length > 0 ? (
                  <button
                    type="button"
                    onClick={onEditGlobalFilters}
                    className="w-full space-y-1 rounded border border-orange-200 bg-orange-50 p-2 text-left text-xs text-orange-800 hover:bg-orange-100"
                    title="Modifier le filtrage global"
                  >
                    {globalFilterSummaryLines.map((line, index) => (
                      <div key={index}>
                        {index > 0 && <div className="my-1 text-orange-900">OU</div>}
                        <div className="ml-2">{line}</div>
                      </div>
                    ))}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onEditGlobalFilters}
                    className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-left text-xs text-gray-600 hover:bg-gray-100"
                    title="Configurer le filtrage global"
                  >
                    Aucun filtre global défini.
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded border">
              <div className="border-b bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {rows.length} ligne{rows.length !== 1 ? 's' : ''} dans le rapport
              </div>
              <div className="h-full overflow-y-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column.id}>{column.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Math.max(columns.length, 1)} className="text-center text-sm text-gray-500">
                          Aucun résultat avec les filtres actuels.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, rowIndex) => (
                        <TableRow key={`preview-row-${rowIndex}`}>
                          {columns.map((column) => (
                            <TableCell key={`${rowIndex}-${column.id}`}>
                              {row[column.id] === null ? '-' : String(row[column.id])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
        </div>
      </div>

      <div className="shrink-0 border-t bg-white px-4 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => openSaveDialog('model')}
            className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
          >
            Enregistrer le modèle
          </button>
          <button
            type="button"
            onClick={() => openSaveDialog('report')}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Enregistrer ce rapport
          </button>
        </div>
      </div>

      <Dialog open={saveDialogMode !== null} onOpenChange={(open) => { if (!open) closeSaveDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{saveDialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="save-report-name" className="text-sm font-medium text-gray-700">
              {saveDialogLabel}
            </label>
            <input
              id="save-report-name"
              type="text"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeSaveDialog}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={closeSaveDialog}
              className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
            >
              Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
