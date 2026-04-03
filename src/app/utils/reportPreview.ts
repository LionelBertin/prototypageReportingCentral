import { AttributeType } from '../data/dataStructure';
import { FilterCondition, FilterGroup, SelectedAttribute } from '../types/selection';

type PreviewCellValue = string | number | boolean | null;

type PreviewMeta = {
  collaboratorStatus: 'present' | 'departed' | 'future';
  department: string;
  establishment: string;
};

const STATUS_DATE_REFERENCE_ATTRIBUTE_ID = '__status-collaborators-date__';

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
  reportDate: string;
  globalFilterGroups?: FilterGroup[];
  collaboratorFilterEnabled: boolean;
  includeDepartedCollaborators: boolean;
  includePresentCollaborators: boolean;
  includeFutureCollaborators: boolean;
  selectedDepartmentFilters: string[];
  selectedEstablishmentFilters: string[];
  departmentUniverse: string[];
  establishmentUniverse: string[];
  sortColumnIds: string[];
  groupedColumnIds: string[];
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

  if (normalizedName.includes('statut')) {
    return meta.collaboratorStatus === 'present'
      ? 'Présent'
      : meta.collaboratorStatus === 'departed'
      ? 'Parti'
      : 'Futur';
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
  reportDate: string,
): boolean => {
  const left = cells[condition.attributeId];
  const right = condition.valueType === 'attribute'
    ? (condition.referenceAttributeId === STATUS_DATE_REFERENCE_ATTRIBUTE_ID
      ? reportDate
      : cells[condition.referenceAttributeId ?? ''])
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
  reportDate: string,
) => {
  if (!groups || groups.length === 0) return true;

  return groups.some((group) => {
    if (group.conditions.length === 0) return true;

    if (group.logicalOperator === 'OU') {
      return group.conditions.some((condition) => evaluateCondition(condition, cells, reportDate));
    }

    return group.conditions.every((condition) => evaluateCondition(condition, cells, reportDate));
  });
};

const applyCollaboratorFilters = (
  rows: PreviewRowInternal[],
  input: GenerateReportPreviewInput,
) => {
  if (!input.collaboratorFilterEnabled) return rows;

  const allowedStatuses = new Set<PreviewMeta['collaboratorStatus']>([
    ...(input.includePresentCollaborators ? ['present' as const] : []),
    ...(input.includeDepartedCollaborators ? ['departed' as const] : []),
    ...(input.includeFutureCollaborators ? ['future' as const] : []),
  ]);

  if (allowedStatuses.size === 0) return [];

  return rows.filter((row) => {
    if (!allowedStatuses.has(row.meta.collaboratorStatus)) {
      return false;
    }

    if (input.selectedDepartmentFilters.length > 0 && !input.selectedDepartmentFilters.includes(row.meta.department)) {
      return false;
    }

    if (input.selectedEstablishmentFilters.length > 0 && !input.selectedEstablishmentFilters.includes(row.meta.establishment)) {
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

export const generateReportPreviewRows = (input: GenerateReportPreviewInput): ReportPreviewRow[] => {
  if (input.columns.length === 0) return [];

  const departmentUniverse = input.departmentUniverse.length > 0
    ? input.departmentUniverse
    : ['People & Tech', 'Revenue & Operations', 'Product Department'];

  const establishmentUniverse = input.establishmentUniverse.length > 0
    ? input.establishmentUniverse
    : ['Lucca FR', 'Lucca UK', 'Lucca Deutschland'];

  const statuses: Array<PreviewMeta['collaboratorStatus']> = ['present', 'departed', 'future'];

  const rows: PreviewRowInternal[] = Array.from({ length: input.rowCount }).map((_, rowIndex) => {
    const meta: PreviewMeta = {
      collaboratorStatus: statuses[rowIndex % statuses.length],
      department: departmentUniverse[rowIndex % departmentUniverse.length],
      establishment: establishmentUniverse[rowIndex % establishmentUniverse.length],
    };

    const cells: Record<string, PreviewCellValue> = {};

    for (const column of input.columns) {
      cells[column.id] = buildFakeValue(column, rowIndex, input.reportDate, meta);
    }

    return {
      id: `preview-row-${rowIndex + 1}`,
      cells,
      meta,
    };
  });

  const collaboratorFilteredRows = applyCollaboratorFilters(rows, input);
  const globalFilteredRows = collaboratorFilteredRows.filter((row) =>
    evaluateGlobalFilters(input.globalFilterGroups, row.cells, input.reportDate)
  );

  const sortedRows = applySortAndGrouping(
    globalFilteredRows,
    input.groupedColumnIds,
    input.sortColumnIds,
  );

  return sortedRows.map((row) => row.cells);
};
