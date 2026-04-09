import { AttributeType } from '../data/dataStructure';
import { FilterCondition, FilterGroup, SelectedAttribute } from '../types/selection';

type PreviewCellValue = string | number | boolean | null;

type PreviewMeta = {
  collaboratorStatus: 'present' | 'departed' | 'futureNew' | 'futureReturn';
  department: string;
  establishment: string;
  collaboratorTarget: string;
  collaboratorName: string;
  contractType: string;
  qualification: string;
};

const STATUS_DATE_REFERENCE_ATTRIBUTE_ID = '__status-collaborators-date__';
const REPORT_PERIOD_START_ATTRIBUTE_ID = '__report-period-start__';
const REPORT_PERIOD_END_ATTRIBUTE_ID = '__report-period-end__';
const REPORT_DATE_VARIABLE_ID = 'dateRapport';
const REPORT_PERIOD_START_VARIABLE_ID = 'dateDebutRapport';
const REPORT_PERIOD_END_VARIABLE_ID = 'dateFinRapport';
const AUTO_FILTER_COLUMN_PREFIX = '__auto-filter-col__';

export type ReportTemporalMode = 'day' | 'period';

export type ReportTemporalContext = {
  mode: ReportTemporalMode;
  reportDate: string;
  periodStartDate?: string;
  periodEndDate?: string;
  /** date unique choisie pour le mode chooseOne */
  chosenDate?: string;
  /** début de période choisie pour le mode choosePeriod */
  chosenPeriodStart?: string;
  /** fin de période choisie pour le mode choosePeriod */
  chosenPeriodEnd?: string;
};

type PreviewRowInternal = {
  id: string;
  cells: Record<string, PreviewCellValue>;
  meta: PreviewMeta;
};

export type ReportPreviewRow = Record<string, PreviewCellValue>;

export type ReportPreviewColumn = {
  id: string;
  label: string;
  attributeType: AttributeType;
  attributeName: string;
  insertionType: SelectedAttribute['insertionType'];
};

export type GenerateReportPreviewInput = {
  columns: ReportPreviewColumn[];
  rowCount: number;
  temporalContext: ReportTemporalContext;
  globalFilterGroups?: FilterGroup[];
  collaboratorFilterEnabled: boolean;
  selectedCollaboratorTarget: string;
  selectedCollaboratorName: string;
  collaboratorContractDateMode: 'today' | 'reportStart' | 'reportEnd' | 'reportColumn';
  selectedCollaboratorContractDateColumnId: string;
  collaboratorTargets: string[];
  collaboratorUniverse: string[];
  selectedContractTypeFilters: string[];
  selectedQualificationFilters: string[];
  contractTypeUniverse: string[];
  includeDepartedCollaborators: boolean;
  includePresentCollaborators: boolean;
  includeFutureNewCollaborators: boolean;
  includeFutureReturnCollaborators: boolean;
  selectedDepartmentFilters: string[];
  selectedEstablishmentFilters: string[];
  qualificationUniverse: string[];
  departmentUniverse: string[];
  establishmentUniverse: string[];
  sortColumnIds: string[];
  groupedColumnIds: string[];
  displayAsColumnsAttributeId?: string;
};

export type GeneratedReportPreview = {
  columns: Array<{ id: string; label: string }>;
  rows: ReportPreviewRow[];
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const addDays = (isoDate: string, dayOffset: number) => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  parsed.setDate(parsed.getDate() + dayOffset);
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
};

const asNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const compareValues = (a: PreviewCellValue, b: PreviewCellValue) => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (isIsoDate(a) && isIsoDate(b)) {
    return a.localeCompare(b);
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  return String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' });
};

const serializeCellValue = (value: PreviewCellValue) => {
  if (value === null) return 'null:';
  return `${typeof value}:${String(value)}`;
};

const getPivotDisplayLabel = (value: PreviewCellValue) => {
  if (value === null || value === '') return '(Vide)';
  return String(value);
};

const buildFakeValue = (
  column: ReportPreviewColumn,
  rowIndex: number,
  reportDate: string,
  meta: PreviewMeta,
): PreviewCellValue => {
  const normalizedName = normalizeText(column.attributeName);

  if (normalizedName.includes('departement')) {
    return meta.department;
  }

  if (normalizedName.includes('etablissement')) {
    return meta.establishment;
  }

  if (normalizedName.includes('type de contrat') || normalizedName === 'type-de-contrat') {
    return meta.contractType;
  }

  if (normalizedName.includes('qualification')) {
    return meta.qualification;
  }

  if (normalizedName.includes('statut')) {
    return meta.collaboratorStatus === 'present'
      ? 'Présent'
      : meta.collaboratorStatus === 'departed'
      ? 'Parti'
      : meta.collaboratorStatus === 'futureNew'
      ? 'Nouveau'
      : 'Retour';
  }

  if (normalizedName.includes('nom')) {
    return `Nom ${rowIndex + 1}`;
  }

  if (normalizedName.includes('prenom')) {
    return `Prenom ${rowIndex + 1}`;
  }

  if (normalizedName.includes('email')) {
    return `collaborateur${rowIndex + 1}@exemple.test`;
  }

  if (normalizedName.includes('telephone') || normalizedName.includes('phone')) {
    return `+33 6 ${String(10 + (rowIndex % 90)).padStart(2, '0')} ${String(20 + (rowIndex % 70)).padStart(2, '0')} ${String(30 + (rowIndex % 60)).padStart(2, '0')} ${String(40 + (rowIndex % 50)).padStart(2, '0')}`;
  }

  if (column.insertionType === 'conditional') {
    return `Condition ${rowIndex + 1}`;
  }

  if (column.insertionType === 'calculated') {
    if (column.attributeType === 'number') return 100 + rowIndex;
    if (column.attributeType === 'boolean') return rowIndex % 2 === 0;
    return `Calcul ${rowIndex + 1}`;
  }

  switch (column.attributeType) {
    case 'number':
      return 20 + rowIndex * 3;
    case 'date':
      return addDays(reportDate, rowIndex - 5);
    case 'boolean':
      return rowIndex % 2 === 0;
    case 'document':
      return `document_${rowIndex + 1}.pdf`;
    default:
      return `${column.attributeName} ${rowIndex + 1}`;
  }
};

const evaluateCondition = (
  condition: FilterCondition,
  cells: Record<string, PreviewCellValue>,
  temporalContext: ReportTemporalContext,
): boolean => {
  const resolveReferenceAttributeValue = (referenceAttributeId: string | undefined) => {
    if (!referenceAttributeId) return '';

    if (referenceAttributeId === REPORT_DATE_VARIABLE_ID || referenceAttributeId === STATUS_DATE_REFERENCE_ATTRIBUTE_ID) {
      return temporalContext.chosenDate ?? temporalContext.reportDate;
    }

    if (referenceAttributeId === REPORT_PERIOD_START_VARIABLE_ID || referenceAttributeId === REPORT_PERIOD_START_ATTRIBUTE_ID) {
      return temporalContext.chosenPeriodStart ?? temporalContext.periodStartDate ?? temporalContext.reportDate;
    }

    if (referenceAttributeId === REPORT_PERIOD_END_VARIABLE_ID || referenceAttributeId === REPORT_PERIOD_END_ATTRIBUTE_ID) {
      return temporalContext.chosenPeriodEnd ?? temporalContext.periodEndDate ?? temporalContext.reportDate;
    }

    return cells[referenceAttributeId];
  };

  const left = cells[condition.attributeId];
  const right = condition.valueType === 'attribute'
    ? resolveReferenceAttributeValue(condition.referenceAttributeId)
    : condition.value;

  const leftText = normalizeText(String(left ?? ''));
  const rightText = normalizeText(String(right ?? ''));
  const rightList = Array.isArray(right)
    ? right
        .map((item) => normalizeText(String(item)))
        .filter(Boolean)
    : null;

  switch (condition.operator) {
    case 'isEmpty':
      return left === null || left === '';
    case 'isNotEmpty':
      return left !== null && left !== '';
    case 'contains':
      if (rightList) return rightList.some((targetValue) => leftText.includes(targetValue));
      return leftText.includes(rightText);
    case 'startsWith':
      return leftText.startsWith(rightText);
    case 'endsWith':
      return leftText.endsWith(rightText);
    case 'in': {
      const targetValues = Array.isArray(right)
        ? right.map((item) => normalizeText(String(item)))
        : String(right ?? '')
            .split(',')
            .map((item) => normalizeText(item.trim()))
            .filter(Boolean);
      return targetValues.includes(leftText);
    }
    case 'greaterThan': {
      if (isIsoDate(left) && isIsoDate(right)) return left > right;
      const ln = asNumber(left);
      const rn = asNumber(right);
      return ln !== null && rn !== null ? ln > rn : leftText > rightText;
    }
    case 'lessThan': {
      if (isIsoDate(left) && isIsoDate(right)) return left < right;
      const ln = asNumber(left);
      const rn = asNumber(right);
      return ln !== null && rn !== null ? ln < rn : leftText < rightText;
    }
    case 'greaterOrEqual': {
      if (isIsoDate(left) && isIsoDate(right)) return left >= right;
      const ln = asNumber(left);
      const rn = asNumber(right);
      return ln !== null && rn !== null ? ln >= rn : leftText >= rightText;
    }
    case 'lessOrEqual': {
      if (isIsoDate(left) && isIsoDate(right)) return left <= right;
      const ln = asNumber(left);
      const rn = asNumber(right);
      return ln !== null && rn !== null ? ln <= rn : leftText <= rightText;
    }
    case 'notEquals':
      if (rightList) return !rightList.includes(leftText);
      return leftText !== rightText;
    case 'equals':
    default:
      if (rightList) return rightList.includes(leftText);
      return leftText === rightText;
  }
};

const evaluateGlobalFilters = (
  groups: FilterGroup[] | undefined,
  cells: Record<string, PreviewCellValue>,
  temporalContext: ReportTemporalContext,
) => {
  if (!groups || groups.length === 0) return true;

  return groups.some((group) => {
    if (group.conditions.length === 0) return true;

    if (group.logicalOperator === 'OU') {
      return group.conditions.some((condition) => evaluateCondition(condition, cells, temporalContext));
    }

    return group.conditions.every((condition) => evaluateCondition(condition, cells, temporalContext));
  });
};

const getPreviewReferenceDate = (temporalContext: ReportTemporalContext) => {
  if (temporalContext.mode === 'period') {
    return temporalContext.periodEndDate || temporalContext.periodStartDate || temporalContext.reportDate;
  }

  return temporalContext.reportDate;
};

const applyCollaboratorFilters = (
  rows: PreviewRowInternal[],
  input: GenerateReportPreviewInput,
) => {
  if (!input.collaboratorFilterEnabled) return rows;

  const allowedStatuses = new Set<PreviewMeta['collaboratorStatus']>([
    ...(input.includePresentCollaborators ? ['present' as const] : []),
    ...(input.includeDepartedCollaborators ? ['departed' as const] : []),
    ...(input.includeFutureNewCollaborators ? ['futureNew' as const] : []),
    ...(input.includeFutureReturnCollaborators ? ['futureReturn' as const] : []),
  ]);

  if (allowedStatuses.size === 0) return [];

  return rows.filter((row) => {
    if (input.selectedCollaboratorTarget && row.meta.collaboratorTarget !== input.selectedCollaboratorTarget) {
      return false;
    }

    if (input.selectedCollaboratorName && row.meta.collaboratorName !== input.selectedCollaboratorName) {
      return false;
    }

    if (input.selectedContractTypeFilters.length > 0 && !input.selectedContractTypeFilters.includes(row.meta.contractType)) {
      return false;
    }

    if (!allowedStatuses.has(row.meta.collaboratorStatus)) {
      return false;
    }

    if (input.selectedDepartmentFilters.length > 0 && !input.selectedDepartmentFilters.includes(row.meta.department)) {
      return false;
    }

    if (input.selectedEstablishmentFilters.length > 0 && !input.selectedEstablishmentFilters.includes(row.meta.establishment)) {
      return false;
    }

    if (input.selectedQualificationFilters.length > 0 && !input.selectedQualificationFilters.includes(row.meta.qualification)) {
      return false;
    }

    return true;
  });
};

const applySortAndGrouping = (
  rows: PreviewRowInternal[],
  groupedColumnIds: string[],
  sortColumnIds: string[],
) => {
  const prioritizedSortIds = [
    ...groupedColumnIds,
    ...sortColumnIds.filter((id) => !groupedColumnIds.includes(id)),
  ];

  if (prioritizedSortIds.length === 0) return rows;

  return [...rows].sort((left, right) => {
    for (const columnId of prioritizedSortIds) {
      const result = compareValues(left.cells[columnId], right.cells[columnId]);
      if (result !== 0) return result;
    }
    return left.id.localeCompare(right.id, 'fr', { sensitivity: 'base' });
  });
};

const getColumnLabelById = (columns: ReportPreviewColumn[], columnId: string) => {
  return columns.find((column) => column.id === columnId)?.label ?? columnId;
};

const buildDisplayAsColumnsPreview = (
  rows: PreviewRowInternal[],
  input: GenerateReportPreviewInput,
): GeneratedReportPreview | null => {
  const pivotColumnId = input.displayAsColumnsAttributeId;
  if (!pivotColumnId) return null;

  const pivotColumn = input.columns.find((column) => column.id === pivotColumnId);
  if (!pivotColumn) return null;

  const groupedColumnIds = input.groupedColumnIds.filter((columnId) => columnId !== pivotColumnId);

  const pivotValues = new Map<string, { rawValue: PreviewCellValue; label: string }>();
  for (const row of rows) {
    const rawValue = row.cells[pivotColumnId] ?? null;
    const key = serializeCellValue(rawValue);
    if (!pivotValues.has(key)) {
      pivotValues.set(key, {
        rawValue,
        label: getPivotDisplayLabel(rawValue),
      });
    }
  }

  const orderedPivotValues = [...pivotValues.entries()]
    .sort(([, left], [, right]) => compareValues(left.rawValue, right.rawValue))
    .map(([pivotKey, value], index) => ({
      pivotKey,
      label: value.label,
      columnId: `pivot:${pivotColumnId}:${index}`,
    }));

  const groups = new Map<string, { groupCells: Record<string, PreviewCellValue>; counts: Map<string, number> }>();
  for (const row of rows) {
    const groupKey = groupedColumnIds.length > 0
      ? groupedColumnIds.map((columnId) => serializeCellValue(row.cells[columnId] ?? null)).join('|')
      : '__all__';

    let group = groups.get(groupKey);
    if (!group) {
      const groupCells: Record<string, PreviewCellValue> = {};
      for (const groupedColumnId of groupedColumnIds) {
        groupCells[groupedColumnId] = row.cells[groupedColumnId] ?? null;
      }
      group = {
        groupCells,
        counts: new Map<string, number>(),
      };
      groups.set(groupKey, group);
    }

    const pivotKey = serializeCellValue(row.cells[pivotColumnId] ?? null);
    group.counts.set(pivotKey, (group.counts.get(pivotKey) ?? 0) + 1);
  }

  const sortedGroups = [...groups.values()].sort((left, right) => {
    for (const columnId of groupedColumnIds) {
      const result = compareValues(left.groupCells[columnId] ?? null, right.groupCells[columnId] ?? null);
      if (result !== 0) return result;
    }
    return 0;
  });

  const columns: Array<{ id: string; label: string }> = [
    ...groupedColumnIds.map((columnId) => ({
      id: columnId,
      label: getColumnLabelById(input.columns, columnId),
    })),
    ...orderedPivotValues.map((pivotValue) => ({
      id: pivotValue.columnId,
      label: pivotValue.label,
    })),
  ];

  const pivotColumnByKey = new Map(orderedPivotValues.map((entry) => [entry.pivotKey, entry.columnId] as const));

  const previewRows: ReportPreviewRow[] = sortedGroups.map((group) => {
    const output: ReportPreviewRow = {};

    for (const groupedColumnId of groupedColumnIds) {
      output[groupedColumnId] = group.groupCells[groupedColumnId] ?? null;
    }

    for (const pivotValue of orderedPivotValues) {
      const columnId = pivotColumnByKey.get(pivotValue.pivotKey);
      if (!columnId) continue;
      output[columnId] = group.counts.get(pivotValue.pivotKey) ?? 0;
    }

    return output;
  });

  return {
    columns,
    rows: previewRows,
  };
};

export const generateReportPreviewRows = (input: GenerateReportPreviewInput): GeneratedReportPreview => {
  if (input.columns.length === 0) {
    return {
      columns: [],
      rows: [],
    };
  }

  const previewReferenceDate = getPreviewReferenceDate(input.temporalContext);

  const departmentUniverse = input.departmentUniverse.length > 0
    ? input.departmentUniverse
    : ['People & Tech', 'Revenue & Operations', 'Product Department'];

  const establishmentUniverse = input.establishmentUniverse.length > 0
    ? input.establishmentUniverse
    : ['Lucca FR', 'Lucca UK', 'Lucca Deutschland'];

  const collaboratorTargets = input.collaboratorTargets.length > 0
    ? input.collaboratorTargets
    : ['Collaborateur'];

  const collaboratorUniverse = input.collaboratorUniverse.length > 0
    ? input.collaboratorUniverse
    : ['Dupont Jean', 'Martin Claire', 'Lefevre Marie'];

  const contractTypeUniverse = input.contractTypeUniverse.length > 0
    ? input.contractTypeUniverse
    : ['CDI', 'CDD', 'Stage'];

  const qualificationUniverse = input.qualificationUniverse.length > 0
    ? input.qualificationUniverse
    : ['Consultant Junior (Grade1)', 'Developer Confirmed (Grade2)', 'Project Manager Senior (Grade3)'];

  const statuses: Array<PreviewMeta['collaboratorStatus']> = ['present', 'departed', 'futureNew', 'futureReturn'];

  const rows: PreviewRowInternal[] = Array.from({ length: input.rowCount }).map((_, rowIndex) => {
    const meta: PreviewMeta = {
      collaboratorStatus: statuses[rowIndex % statuses.length],
      department: departmentUniverse[rowIndex % departmentUniverse.length],
      establishment: establishmentUniverse[rowIndex % establishmentUniverse.length],
      collaboratorTarget: collaboratorTargets[rowIndex % collaboratorTargets.length],
      collaboratorName: collaboratorUniverse[rowIndex % collaboratorUniverse.length],
      contractType: contractTypeUniverse[rowIndex % contractTypeUniverse.length],
      qualification: qualificationUniverse[rowIndex % qualificationUniverse.length],
    };

    const cells: Record<string, PreviewCellValue> = {};

    for (const column of input.columns) {
      cells[column.id] = buildFakeValue(column, rowIndex, previewReferenceDate, meta);
    }

    return {
      id: `preview-row-${rowIndex + 1}`,
      cells,
      meta,
    };
  });

  const collaboratorFilteredRows = applyCollaboratorFilters(rows, input);
  const globalFilteredRows = collaboratorFilteredRows.filter((row) =>
    evaluateGlobalFilters(input.globalFilterGroups, row.cells, input.temporalContext)
  );

  const sortedRows = applySortAndGrouping(
    globalFilteredRows,
    input.groupedColumnIds,
    input.sortColumnIds,
  );

  const displayAsColumnsPreview = buildDisplayAsColumnsPreview(sortedRows, input);
  if (displayAsColumnsPreview) {
    return displayAsColumnsPreview;
  }

  return {
    columns: input.columns
      .filter((column) => !column.id.startsWith(AUTO_FILTER_COLUMN_PREFIX))
      .map((column) => ({
      id: column.id,
      label: column.label,
      })),
    rows: sortedRows.map((row) => row.cells),
  };
};
