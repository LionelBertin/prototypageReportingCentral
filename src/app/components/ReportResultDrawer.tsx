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

type ReportResultDrawerProps = {
  onBackToConfiguration: () => void;
  mainObjectName: string;
  columns: ReportPreviewColumn[];
  rows: ReportPreviewRow[];
  reportLastUpdatedAt?: string;
  onRefreshReport?: () => void;
  mainObjectLinkedToCollaborateur: boolean;
  collaboratorTargetingLines: string[];
  globalFilterSummaryLines: string[];
  collaboratorTargetingSummaryLabel: string;
  canEditReport?: boolean;
  canShareReport?: boolean;
  canSendReport?: boolean;
  canSaveModel?: boolean;
  collaboratorOptions?: string[];
  onEditGlobalFilters: () => void;
};

export function ReportResultDrawer({
  onBackToConfiguration,
  mainObjectName,
  columns,
  rows,
  reportLastUpdatedAt,
  onRefreshReport,
  mainObjectLinkedToCollaborateur,
  collaboratorTargetingLines,
  globalFilterSummaryLines,
  collaboratorTargetingSummaryLabel,
  canEditReport = true,
  canShareReport = true,
  canSendReport = true,
  canSaveModel = true,
  collaboratorOptions = [],
  onEditGlobalFilters,
}: ReportResultDrawerProps) {
  const [collaboratorTargetingExpanded, setCollaboratorTargetingExpanded] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<'model' | 'report' | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedShareCollaborators, setSelectedShareCollaborators] = useState<string[]>([]);
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

  const toggleShareCollaborator = (name: string, shouldSelect: boolean) => {
    setSelectedShareCollaborators((prev) => {
      const next = new Set(prev);
      if (shouldSelect) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return Array.from(next).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <div className="mx-auto flex min-h-full w-full max-w-full flex-col gap-3 px-4">
            <div className="grid shrink-0 gap-3 lg:grid-cols-2">
              <div className="rounded border p-3">
                <button
                  type="button"
                  onClick={() => setCollaboratorTargetingExpanded((prev) => !prev)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="flex items-center gap-1 text-sm font-medium text-gray-800">
                    <span className="inline-block w-2">{collaboratorTargetingExpanded ? 'v' : '>'}</span>
                    <span>Cibler des contrats et postes</span>
                  </span>
                  <span className="text-xs text-gray-600">
                    {mainObjectLinkedToCollaborateur ? collaboratorTargetingSummaryLabel : 'Non applicable'}
                  </span>
                </button>

                {collaboratorTargetingExpanded && (
                  <div className={`space-y-2 pt-2 ${mainObjectLinkedToCollaborateur ? 'border-t border-gray-200' : ''}`}>
                    {!mainObjectLinkedToCollaborateur && (
                      <div className="text-xs text-gray-600">
                        Aucun lien (même indirect) avec Collaborateur depuis l'objet principal.
                      </div>
                    )}
                    {mainObjectLinkedToCollaborateur && collaboratorTargetingLines.length > 0 && (
                      <div className="mt-2 rounded border border-orange-200 bg-orange-50 p-2 text-xs text-orange-800">
                        {collaboratorTargetingLines.map((line, index) => (
                          <div key={index}>• {line}</div>
                        ))}
                      </div>
                    )}

                    {mainObjectLinkedToCollaborateur && collaboratorTargetingLines.length === 0 && (
                      <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
                        Aucun filtre collaborateur appliqué.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded border p-3">
                <div className="mb-1 text-[11px] font-medium leading-none text-gray-700">Filtrer les colonnes du rapport</div>

                {globalFilterSummaryLines.length > 0 ? (
                  <button
                    type="button"
                    onClick={onEditGlobalFilters}
                    className="w-full rounded border border-orange-200 bg-orange-50 p-2 text-left text-xs text-orange-800 hover:bg-orange-100"
                    title="Modifier le filtrage global"
                  >
                    <div className="mb-1 font-normal">Filtres actifs :</div>
                    <div className="space-y-1 font-normal">
                      {globalFilterSummaryLines.map((line, index) => (
                        <div key={index}>
                          {index > 0 && <div className="my-1 font-normal text-orange-900">OU</div>}
                          <div className="ml-2 font-normal">{line}</div>
                        </div>
                      ))}
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onEditGlobalFilters}
                    className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-left text-xs text-gray-600 hover:bg-gray-100"
                    title="Configurer le filtrage global"
                  >
                    <span>Aucun filtre global défini</span>
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
        <div className="flex flex-wrap items-center gap-2">
          {onRefreshReport && (
            <button
              type="button"
              onClick={onRefreshReport}
              className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
            >
              Actualiser
            </button>
          )}
          {reportLastUpdatedAt && (
            <div className="text-xs text-gray-500">{reportLastUpdatedAt}</div>
          )}
          {canEditReport && (
            <button
              type="button"
              onClick={onBackToConfiguration}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Éditer la configuration
            </button>
          )}
            {canShareReport && (
              <button
                type="button"
                onClick={() => setShareDialogOpen(true)}
                className="rounded border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-100"
              >
                Partager
              </button>
            )}
            {canSaveModel && (
              <button
                type="button"
                onClick={() => openSaveDialog('model')}
                className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
              >
                Enregistrer le modèle
              </button>
            )}
            {canSendReport && (
              <button
                type="button"
                onClick={() => openSaveDialog('report')}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Enregistrer ce rapport
              </button>
            )}
        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={(open) => setShareDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager le rapport</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm text-gray-700">Sélectionnez un ou plusieurs collaborateurs :</div>
            <div className="max-h-48 overflow-y-auto rounded border border-gray-200 p-2 text-sm">
              {collaboratorOptions.length === 0 ? (
                <div className="text-gray-500">Aucun collaborateur disponible.</div>
              ) : (
                collaboratorOptions.map((collaborator) => (
                  <label key={collaborator} className="flex items-center gap-2 py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedShareCollaborators.includes(collaborator)}
                      onChange={(event) => toggleShareCollaborator(collaborator, event.target.checked)}
                    />
                    <span>{collaborator}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShareDialogOpen(false)}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => setShareDialogOpen(false)}
              className="rounded border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-100"
            >
              Partager
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
