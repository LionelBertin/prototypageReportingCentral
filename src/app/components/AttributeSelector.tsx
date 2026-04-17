import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { SelectionPanel } from './SelectionPanel';
import MainObjectPicker from './MainObjectPicker';
import { ObjectInsertionDialog, ObjectInsertionConfig } from './ObjectInsertionDialog';
import { FilterDialog } from './FilterDialog';
import { ReportResultDrawer } from './ReportResultDrawer';
import { CompartmentDialog } from './CompartmentDialog';
import { ConditionalColumnDialog } from './ConditionalColumnDialog';
import { CalculatedColumnDialog } from './CalculatedColumnDialog';
import { DateReferenceDialog } from './DateReferenceDialog';
import { InfoHint } from './InfoHint';
import { SelectedAttribute, AggregationType, InsertionType, FilterGroup, CompartmentConfig, DateReference, ConditionalColumnConfig, CalculatedColumnConfig } from '../types/selection';
import { AttributeType, DefaultDateFiltering, SmartObjectDefinition, dataStructure } from '../data/dataStructure';
import { generateReportPreviewRows, ReportPreviewRow, ReportTemporalContext } from '../utils/reportPreview';

type NavigationPath = NonNullable<SelectedAttribute['navigationPath']>;

type MainObjectSelection = {
  themeId: string;
  themeName: string;
  objectId: string;
  objectName: string;
  cardinality: string;
  isApplicable?: boolean;
};

type PendingObjectInsertion = {
  themeId: string;
  themeName: string;
  objectId: string;
  objectName: string;
  cardinality: string;
  mode: 'detailed' | 'operation' | 'aggregation' | 'special';
  isApplicable?: boolean;
  applicationDateMandatory?: boolean;
  applicationDateRequirementMode?: 'day' | 'period';
  smartObjects?: SmartObjectDefinition[];
  navigationPath?: NavigationPath;
  directMagicOnly?: boolean;
  ownObjectOnly?: boolean;
  linkedPeriodFilter?: { attrDate1: string; attrDate2: string };
  linkedDateFilterMode?: 'day' | 'period';
  initialConfig?: Partial<ObjectInsertionConfig>;
  collaboratorMultiTile?: boolean;
};

type AvailableObjectAttribute = {
  id: string;
  name: string;
  rawName: string;
  description?: string;
  tooltip?: string;
  type: AttributeType;
  magicSel?: boolean;
  smartSel?: boolean;
  autoSmartSel?: boolean;
  sourceObjectSupportsApplicable: boolean;
  sourceObjectApplicationDateMandatory: boolean;
  sourceObjectApplicationDateRequirementMode?: 'day' | 'period';
  sourceThemeId: string;
  sourceThemeName: string;
  sourceObjectId: string;
  sourceObjectName: string;
  relativeNavigationPath: NavigationPath;
};

type ContractPosteLotAttributeOption = AvailableObjectAttribute & {
  lotBaseNavigationPath: NavigationPath;
  sectionKey: string;
  sectionLabel: string;
};

type ContractPosteLotAttributeSection = {
  key: string;
  label: string;
  attributes: ContractPosteLotAttributeOption[];
};

type ContractPosteTargetTileNode = {
  key: string;
  label: string;
  attributes: ContractPosteLotAttributeOption[];
  children: ContractPosteTargetTileNode[];
};

type Stage2ObjectGroup = {
  key: string;
  parentKey?: string;
  depth: number;
  label: string;
  objectName: string;
  tooltip?: string;
  themeId: string;
  themeName: string;
  objectId: string;
  cardinality: string;
  navigationPath: NavigationPath;
  isSelectable: boolean;
  objectSupportsApplicable: boolean;
  objectApplicationDateMandatory: boolean;
  objectApplicationDateRequirementMode?: 'day' | 'period';
  attributes: AvailableObjectAttribute[];
};

type LinkedMultiCardinalityObject = {
  key: string;
  themeId: string;
  themeName: string;
  objectId: string;
  objectName: string;
  linkCardinality: string;
  navigationPath: NavigationPath;
  canInsert: boolean;
  linkedPeriodFilter?: { attrDate1: string; attrDate2: string };
  linkedDateFilterMode?: 'day' | 'period';
};

type DepartmentNode = {
  name: string;
  children: DepartmentNode[];
};

type QualificationNode = {
  name: string;
  children: QualificationNode[];
};

type CollaboratorTargetOption = {
  key: string;
  label: string;
  isMainCollaborator: boolean;
};

type CollaboratorContractDateMode = 'today' | 'reportStart' | 'reportEnd' | 'reportColumn';

const getObjectGroupTitleFromNavigationPath = (objectName: string, navigationPath: NavigationPath = []) => {
  if (navigationPath.length === 0) {
    return objectName;
  }

  const relationParts: string[] = [];

  for (let index = navigationPath.length - 1; index >= 1; index -= 1) {
    const step = navigationPath[index];
    const stepLabel = step.relationLabel?.trim() || step.objectName?.trim() || '';
    if (stepLabel) {
      relationParts.push(stepLabel);
    }
  }

  const rootStep = navigationPath[0];
  const rootObjectName = rootStep.objectName?.trim() || objectName;
  const rootRelationLabel = rootStep.relationLabel?.trim() || '';
  const rootPart = rootRelationLabel && rootRelationLabel !== rootObjectName
    ? `${rootObjectName} • ${rootRelationLabel}`
    : rootObjectName;

  if (rootPart) {
    relationParts.push(rootPart);
  }

  return relationParts.length > 0 ? relationParts.join(' < ') : objectName;
};

const getAutoFilterAttributeDisplayName = (
  attribute: AvailableObjectAttribute,
  baseNavigationPath: NavigationPath = []
) => {
  const fullNavigationPath = [...baseNavigationPath, ...attribute.relativeNavigationPath];
  const groupTitle = getObjectGroupTitleFromNavigationPath(attribute.sourceObjectName, fullNavigationPath);
  return `${attribute.rawName} – ${groupTitle}`;
};

const REPORT_DATE_VARIABLE_ID = 'dateRapport';
const REPORT_DATE_VARIABLE_LABEL = 'date du rapport';
const REPORT_PERIOD_START_VARIABLE_ID = 'dateDebutRapport';
const REPORT_PERIOD_START_VARIABLE_LABEL = 'date de début du rapport';
const REPORT_PERIOD_END_VARIABLE_ID = 'dateFinRapport';
const REPORT_PERIOD_END_VARIABLE_LABEL = 'date de fin du rapport';
const AUTO_FILTER_COLUMN_PREFIX = '__auto-filter-col__';
const MAX_APPLICABLE_MANAGER_DEPTH = 3;

const getNavigationPathSignature = (path: NavigationPath = []) =>
  path
    .map((item) => `${item.sourceObjectName ?? ''}:${item.relationLabel ?? ''}:${item.objectName}:${item.cardinalityName ?? ''}`)
    .join('>');

const getContractPosteLotAttributeKey = (
  themeId: string,
  objectId: string,
  attributeId: string,
  navigationPath: NavigationPath = []
) => `${themeId}::${objectId}::${attributeId}::${getNavigationPathSignature(navigationPath)}`;

const getTodayIsoDate = () => {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
};

const addMonthsIsoDate = (isoDate: string, monthsOffset: number) => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  parsed.setMonth(parsed.getMonth() + monthsOffset);
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
};

const parseRelativeTodayExpression = (expression: string, todayIsoDate: string) => {
  const normalized = expression.trim();
  if (!normalized) return undefined;

  const relativeMatch = normalized.match(/^dateDuJour(?:\s*([+-])\s*(\d+)\s*([a-zA-Zéèêûùîïëäöüç]+))?$/i);
  if (!relativeMatch) return undefined;

  const [, sign, amountRaw, unitRaw] = relativeMatch;
  const baseDate = new Date(`${todayIsoDate}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) return undefined;

  if (sign && amountRaw && unitRaw) {
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) return undefined;
    const offset = sign === '-' ? -amount : amount;

    const unit = unitRaw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();

    if (unit === 'day' || unit === 'days' || unit === 'jour' || unit === 'jours') {
      baseDate.setDate(baseDate.getDate() + offset);
    } else if (unit === 'week' || unit === 'weeks' || unit === 'semaine' || unit === 'semaines') {
      baseDate.setDate(baseDate.getDate() + offset * 7);
    } else if (unit === 'month' || unit === 'months' || unit === 'mois') {
      baseDate.setMonth(baseDate.getMonth() + offset);
    } else if (
      unit === 'year'
      || unit === 'years'
      || unit === 'an'
      || unit === 'ans'
      || unit === 'annee'
      || unit === 'annees'
    ) {
      baseDate.setFullYear(baseDate.getFullYear() + offset);
    } else {
      return undefined;
    }
  }

  return [
    baseDate.getFullYear(),
    String(baseDate.getMonth() + 1).padStart(2, '0'),
    String(baseDate.getDate()).padStart(2, '0'),
  ].join('-');
};

const getQuickDatePresets = () => {
  const d = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  // Mois dernier
  const lastMonthEnd = new Date(y, m, 0);
  const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
  // Trimestre dernier
  const currentQ = Math.floor(m / 3);
  const prevQ = currentQ === 0 ? 3 : currentQ - 1;
  const prevQYear = currentQ === 0 ? y - 1 : y;
  const prevQStartMonth = prevQ * 3;
  const lastQStart = new Date(prevQYear, prevQStartMonth, 1);
  const lastQEnd = new Date(prevQYear, prevQStartMonth + 3, 0);
  // Année dernière
  const lastYearStart = new Date(y - 1, 0, 1);
  const lastYearEnd = new Date(y - 1, 11, 31);
  return [
    { label: 'Mois dernier', start: d(lastMonthStart), end: d(lastMonthEnd) },
    { label: 'Trimestre dernier', start: d(lastQStart), end: d(lastQEnd) },
    { label: 'Année dernière', start: d(lastYearStart), end: d(lastYearEnd) },
  ];
};

const isoToFrDate = (isoDate: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const frToIsoDate = (frDate: string) => {
  const trimmed = frDate.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const normalized = [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
  return normalized === iso ? iso : null;
};

const createDefaultTemporalContext = (): ReportTemporalContext => {
  const today = getTodayIsoDate();
  const twelveMonthsAgo = addMonthsIsoDate(today, -12);
  return {
    mode: 'period',
    reportDate: today,
    periodStartDate: twelveMonthsAgo,
    periodEndDate: today,
  };
};

const parseDepartmentHierarchy = (raw: string): DepartmentNode[] => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => ({
      label: line.trim(),
      indent: (line.match(/^\s*/) ?? [''])[0].length,
    }))
    .filter((entry) => entry.label.length > 0 && entry.label.toLocaleLowerCase() !== 'lucca');

  const roots: DepartmentNode[] = [];
  const stack: Array<{ indent: number; node: DepartmentNode }> = [];

  for (const line of lines) {
    const currentNode: DepartmentNode = { name: line.label, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].indent >= line.indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]?.node;
    if (parent) {
      parent.children.push(currentNode);
    } else {
      roots.push(currentNode);
    }

    stack.push({ indent: line.indent, node: currentNode });
  }

  return roots;
};

const parseQualificationHierarchy = (raw: string): QualificationNode[] => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => ({
      label: line.trim(),
      indent: (line.match(/^\s*/) ?? [''])[0].length,
    }))
    .filter((entry) => entry.label.length > 0);

  const roots: QualificationNode[] = [];
  const stack: Array<{ indent: number; node: QualificationNode }> = [];

  for (const line of lines) {
    const currentNode: QualificationNode = { name: line.label, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].indent >= line.indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]?.node;
    if (parent) {
      parent.children.push(currentNode);
    } else {
      roots.push(currentNode);
    }

    stack.push({ indent: line.indent, node: currentNode });
  }

  return roots;
};

const parseEstablishmentOptions = (raw: string) => Array.from(
  new Set(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

const parseCollaboratorOptions = (raw: string) => Array.from(
  new Set(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

const flattenDepartmentTree = (nodes: DepartmentNode[]): string[] => {
  return nodes.flatMap((node) => [node.name, ...flattenDepartmentTree(node.children)]);
};

function DepartmentTreeItem({
  node,
  level,
  disabled,
  selectedValues,
  onToggle,
  path,
}: {
  node: DepartmentNode;
  level: number;
  disabled: boolean;
  selectedValues: string[];
  onToggle: (node: DepartmentNode, checked: boolean) => void;
  path?: string;
}) {
  const checkboxId = `${path ?? 'dept'}-${node.name}`;

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
          checked={selectedValues.includes(node.name)}
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
              selectedValues={selectedValues}
              onToggle={onToggle}
              path={checkboxId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type AttributeSelectorProps = {
  canEditReport?: boolean;
  canShareReport?: boolean;
  canSendReport?: boolean;
  canSaveModel?: boolean;
  startInConsultation?: boolean;
  consultationReportTitle?: string;
  consultationIsFavorite?: boolean;
  onToggleConsultationFavorite?: (reportTitle: string) => void;
  onReportDisplayNameChange?: (reportTitle: string) => void;
  onReportGenerated?: (payload: { title: string; domain?: string; mainObjectName: string }) => void;
  topRightActions?: ReactNode;
  bottomLeftActions?: ReactNode;
  preferredMainObjectDomain?: string;
};

export function AttributeSelector({
  canEditReport = true,
  canShareReport = true,
  canSendReport = true,
  canSaveModel = true,
  startInConsultation = false,
  consultationReportTitle,
  consultationIsFavorite,
  onToggleConsultationFavorite,
  onReportDisplayNameChange,
  onReportGenerated,
  topRightActions,
  bottomLeftActions,
  preferredMainObjectDomain,
}: AttributeSelectorProps = {}) {
  const [selectedAttributes, setSelectedAttributes] = useState<SelectedAttribute[]>([]);
  const [selectingMainObject, setSelectingMainObject] = useState(!startInConsultation);
  const [mainObject, setMainObject] = useState<Omit<MainObjectSelection, 'cardinality' | 'isApplicable'> | null>(null);
  const [mainObjectConfig, setMainObjectConfig] = useState<ObjectInsertionConfig | null>(null);
  const [pendingMainObject, setPendingMainObject] = useState<MainObjectSelection | null>(null);
  const [objectInsertionDialogOpen, setObjectInsertionDialogOpen] = useState(false);
  const [pendingObjectInsertion, setPendingObjectInsertion] = useState<PendingObjectInsertion | null>(null);
  const [globalFilterDialogOpen, setGlobalFilterDialogOpen] = useState(false);
  const [globalFilterGroups, setGlobalFilterGroups] = useState<FilterGroup[] | undefined>(undefined);
  const [groupedColumnIds, setGroupedColumnIds] = useState<string[]>([]);
  const [pendingGroupColumnId, setPendingGroupColumnId] = useState<string>('');
  const [displayAsColumnsAttributeId, setDisplayAsColumnsAttributeId] = useState<string>('');
  const [sortColumnIds, setSortColumnIds] = useState<string[]>([]);
  const [pendingSortColumnId, setPendingSortColumnId] = useState<string>('');
  const [draggedSortColumnId, setDraggedSortColumnId] = useState<string | null>(null);
  const [dragOverSortColumnId, setDragOverSortColumnId] = useState<string | null>(null);
  const [compartmentDialogOpen, setCompartmentDialogOpen] = useState(false);
  const [dateReferenceDialogOpen, setDateReferenceDialogOpen] = useState(false);
  const [conditionalColumnDialogOpen, setConditionalColumnDialogOpen] = useState(false);
  const [calculatedColumnDialogOpen, setCalculatedColumnDialogOpen] = useState(false);
  const [editingAggregationAttributeId, setEditingAggregationAttributeId] = useState<string | null>(null);
  const [editingOperationGroupKey, setEditingOperationGroupKey] = useState<string | null>(null);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);
  const [editingObjectInstanceKey, setEditingObjectInstanceKey] = useState<string | null>(null);
  const [editingInsertionLotId, setEditingInsertionLotId] = useState<string | null>(null);
  const [contractPosteLotAttributesDialogOpen, setContractPosteLotAttributesDialogOpen] = useState(false);
  const [contractPosteLotDateDialogOpen, setContractPosteLotDateDialogOpen] = useState(false);
  const [draftLotDateMode, setDraftLotDateMode] = useState<CollaboratorContractDateMode>('reportEnd');
  const [draftLotDateColumnId, setDraftLotDateColumnId] = useState<string>('');
  const [draftLotAttributeKeys, setDraftLotAttributeKeys] = useState<string[]>([]);
  const [showCompartmenting, setShowCompartmenting] = useState(false);
  const [showConditionalColumns, setShowConditionalColumns] = useState(false);
  const [showCalculatedColumns, setShowCalculatedColumns] = useState(false);
  const [showColumnRename, setShowColumnRename] = useState(false);
  const [showDisplayAsColumns, setShowDisplayAsColumns] = useState(false);
  const [showLinkedObjectCardinalities, setShowLinkedObjectCardinalities] = useState(true);
  const [showOtherCardinalitiesButton, setShowOtherCardinalitiesButton] = useState(false);
  const [showSelectAllButton, setShowSelectAllButton] = useState(true);
  const [reportTemporalContext, setReportTemporalContext] = useState<ReportTemporalContext>(() => createDefaultTemporalContext());
  // Dates pour chooseOne/choosePeriod — modifiables par l'utilisateur dans la config
  const [reportChosenDate, setReportChosenDate] = useState<string>(() => getTodayIsoDate());
  const [reportChosenPeriodStart, setReportChosenPeriodStart] = useState<string>(() => addMonthsIsoDate(getTodayIsoDate(), -12));
  const [reportChosenPeriodEnd, setReportChosenPeriodEnd] = useState<string>(() => getTodayIsoDate());
  const [includeDepartedCollaborators, setIncludeDepartedCollaborators] = useState(false);
  const [includePresentCollaborators, setIncludePresentCollaborators] = useState(true);
  const [includeFutureNewCollaborators, setIncludeFutureNewCollaborators] = useState(false);
  const [includeFutureReturnCollaborators, setIncludeFutureReturnCollaborators] = useState(false);
  const [collaboratorContextExpanded, setCollaboratorContextExpanded] = useState(false);
  const [selectedCollaboratorTarget, setSelectedCollaboratorTarget] = useState('');
  const [selectedCollaboratorName, setSelectedCollaboratorName] = useState('');
  const [collaboratorContractDateMode, setCollaboratorContractDateMode] = useState<CollaboratorContractDateMode>('reportEnd');
  const [selectedCollaboratorContractDateColumnId, setSelectedCollaboratorContractDateColumnId] = useState('');
  const [selectedManagerCollaboratorName, setSelectedManagerCollaboratorName] = useState('');
  const [includeManagerDescendants, setIncludeManagerDescendants] = useState(false);
  const [selectedContractTypeFilters, setSelectedContractTypeFilters] = useState<string[]>([]);
  const [selectedQualificationFilters, setSelectedQualificationFilters] = useState<string[]>([]);
  const [selectedDepartmentFilters, setSelectedDepartmentFilters] = useState<string[]>([]);
  const [selectedEstablishmentFilters, setSelectedEstablishmentFilters] = useState<string[]>([]);
  const [departmentTree, setDepartmentTree] = useState<DepartmentNode[]>([]);
  const [qualificationTree, setQualificationTree] = useState<QualificationNode[]>([]);
  const [establishmentOptions, setEstablishmentOptions] = useState<string[]>([]);
  const [collaboratorOptions, setCollaboratorOptions] = useState<string[]>([]);
  const [collaboratorStatusFilterExpanded, setCollaboratorStatusFilterExpanded] = useState(false);
  const [prototypeConfigOpen, setPrototypeConfigOpen] = useState(false);
  const [reportResultOpen, setReportResultOpen] = useState(startInConsultation);
  const [reportPreviewColumns, setReportPreviewColumns] = useState<Array<{ id: string; label: string }>>([]);
  const [reportPreviewRows, setReportPreviewRows] = useState<ReportPreviewRow[]>([]);
  const [reportPreviewLastUpdatedAt, setReportPreviewLastUpdatedAt] = useState<string>('');
  const [draftShowCompartmenting, setDraftShowCompartmenting] = useState(false);
  const [draftShowConditionalColumns, setDraftShowConditionalColumns] = useState(false);
  const [draftShowCalculatedColumns, setDraftShowCalculatedColumns] = useState(false);
  const [draftShowColumnRename, setDraftShowColumnRename] = useState(false);
  const [draftShowDisplayAsColumns, setDraftShowDisplayAsColumns] = useState(false);
  const [draftShowLinkedObjectCardinalities, setDraftShowLinkedObjectCardinalities] = useState(true);
  const [draftShowOtherCardinalitiesButton, setDraftShowOtherCardinalitiesButton] = useState(false);
  const [draftShowSelectAllButton, setDraftShowSelectAllButton] = useState(true);
  const [linkedMultiCardinalityDialogGroup, setLinkedMultiCardinalityDialogGroup] = useState<Stage2ObjectGroup | null>(null);
  const [linkedMultiCardinalityInsertionTarget, setLinkedMultiCardinalityInsertionTarget] = useState<LinkedMultiCardinalityObject | null>(null);
  const [availableAttributeSearchTerm, setAvailableAttributeSearchTerm] = useState('');
  const [collapsedAvailableGroupKeys, setCollapsedAvailableGroupKeys] = useState<string[]>([]);
  const [collapsedApplicableTileKeys, setCollapsedApplicableTileKeys] = useState<string[]>([]);
  const [pendingInitialAvailableGroupsCollapse, setPendingInitialAvailableGroupsCollapse] = useState(false);
  const availableDataListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadCollaboratorOrgLists = async () => {
      try {
        const [departmentsResponse, establishmentsResponse, qualificationsResponse, collaboratorsResponse] = await Promise.all([
          fetch('/arboSimpleDepartements.md'),
          fetch('/mock_listeEtablissements.md'),
          fetch('/referentielQualifications.txt'),
          fetch('/listeCollaborateurs.txt'),
        ]);

        if (!departmentsResponse.ok || !establishmentsResponse.ok || !qualificationsResponse.ok || !collaboratorsResponse.ok) {
          return;
        }

        const [departmentsRaw, establishmentsRaw, qualificationsRaw, collaboratorsRaw] = await Promise.all([
          departmentsResponse.text(),
          establishmentsResponse.text(),
          qualificationsResponse.text(),
          collaboratorsResponse.text(),
        ]);

        setDepartmentTree(parseDepartmentHierarchy(departmentsRaw));
        setEstablishmentOptions(parseEstablishmentOptions(establishmentsRaw));
        setQualificationTree(parseQualificationHierarchy(qualificationsRaw));
        setCollaboratorOptions(parseCollaboratorOptions(collaboratorsRaw));
      } catch (error) {
        console.warn('Impossible de charger les listes DE/ETAB/QUALIF/COLLAB.', error);
      }
    };

    loadCollaboratorOrgLists();
  }, []);

  useEffect(() => {
    setSelectedCollaboratorName((previous) => {
      if (!previous) return '';
      return collaboratorOptions.includes(previous) ? previous : '';
    });
  }, [collaboratorOptions]);

  useEffect(() => {
    if (!selectingMainObject) {
      setAvailableAttributeSearchTerm('');
    }
  }, [selectingMainObject]);

  useEffect(() => {
    if (!selectingMainObject && mainObject) {
      availableDataListRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [mainObject, selectingMainObject]);

  const buildSelectedAttribute = ({
    themeId,
    themeName,
    objectId,
    objectName,
    attributeId,
    attributeName,
    attributeType,
    insertionType,
    sortAttributeId,
    aggregationType,
    isApplicable,
    dateReference,
    filterGroups,
    navigationPath,
    ownObjectOnly,
    insertionLotId,
    insertionLotLabel,
    insertionLotDateMode,
    insertionLotDateColumnId,
    insertionLotDateLabel,
    lockedDateReferenceLabel,
  }: {
    themeId: string;
    themeName: string;
    objectId: string;
    objectName: string;
    attributeId: string;
    attributeName: string;
    attributeType: AttributeType;
    insertionType: InsertionType;
    sortAttributeId?: string;
    aggregationType?: AggregationType;
    isApplicable?: boolean;
    dateReference?: DateReference;
    filterGroups?: FilterGroup[];
    navigationPath?: NavigationPath;
    ownObjectOnly?: boolean;
    insertionLotId?: string;
    insertionLotLabel?: string;
    insertionLotDateMode?: CollaboratorContractDateMode;
    insertionLotDateColumnId?: string;
    insertionLotDateLabel?: string;
    lockedDateReferenceLabel?: string;
  }): SelectedAttribute => {
    const effectiveApplicable = insertionType === 'applicable' || !!isApplicable;

    const sourceTheme = dataStructure.find((t) => t.id === themeId);
    const sourceObj = sourceTheme?.objects.find((o) => o.id === objectId);

    return {
      id: `${Date.now()}-${Math.random()}`,
      attributeId,
      attributeName,
      attributeType,
      objectId,
      objectName,
      themeId,
      themeName,
      insertionType,
      sortAttributeId,
      aggregationType,
      filterGroups,
      isApplicable: effectiveApplicable,
      dateReference: effectiveApplicable ? (dateReference ?? { type: 'today' }) : undefined,
      applicationDateConfig: sourceObj?.applicationDateConfig,
      navigationPath,
      ownObjectOnly,
      insertionLotId,
      insertionLotLabel,
      insertionLotDateMode,
      insertionLotDateColumnId,
      insertionLotDateLabel,
      lockedDateReferenceLabel,
    };
  };

  const isSingleRelationCardinality = (cardinality?: string) => {
    if (!cardinality) return true;
    return !cardinality.includes('n');
  };

  const getLinkedNavigationPathSignature = (navigationPath: NavigationPath = []) =>
    navigationPath
      .map((step) => `${step.objectName}:${step.cardinalityName ?? ''}:${step.relationLabel ?? ''}:${step.sourceObjectName ?? ''}`)
      .join('>');

  const getLinkedContextKey = (themeId: string, objectId: string, navigationPath: NavigationPath = []) =>
    `${themeId}::${objectId}::${getLinkedNavigationPathSignature(navigationPath)}`;

  const getLinkedPeriodFilterFromDefaultDateFiltering = (defaultDateFiltering: DefaultDateFiltering | undefined) => {
    if (!defaultDateFiltering || typeof defaultDateFiltering !== 'object') return undefined;
    if (!defaultDateFiltering.attrDate1 || !defaultDateFiltering.attrDate2) return undefined;
    return {
      attrDate1: defaultDateFiltering.attrDate1,
      attrDate2: defaultDateFiltering.attrDate2,
    };
  };

  const hasReportPeriodVariables = () => {
    if (!mainObjectDefinition) return false;
    return mainObjectDefinition.defaultDateFiltering === 'choosePeriod'
      || (typeof mainObjectDefinition.defaultDateFiltering === 'object' && mainObjectDefinition.defaultDateFiltering !== null);
  };

  const hasReportSingleDateVariable = () => {
    if (!mainObjectDefinition) return false;
    return mainObjectDefinition.defaultDateFiltering === 'chooseOne';
  };

  const getLinkedMultipleCardinalityObjects = (group: Stage2ObjectGroup) => {
    const objectByKey = new Map(
      dataStructure.flatMap((theme) =>
        theme.objects.map((obj) => [`${theme.id}::${obj.id}`, { theme, obj }] as const)
      )
    );

    const current = objectByKey.get(`${group.themeId}::${group.objectId}` as `${string}::${string}`);
    if (!current) return [] as LinkedMultiCardinalityObject[];

    const linkedByKey = new Map<string, LinkedMultiCardinalityObject>();

    const upsertLinked = (candidate: LinkedMultiCardinalityObject) => {
      const existing = linkedByKey.get(candidate.key);
      if (!existing) {
        linkedByKey.set(candidate.key, candidate);
        return;
      }

      if (!existing.canInsert && candidate.canInsert) {
        linkedByKey.set(candidate.key, candidate);
      }
    };

    for (const relation of current.obj.relations ?? []) {
      if (isSingleRelationCardinality(relation.cardinality)) continue;
      const target = objectByKey.get(`${relation.targetThemeId}::${relation.targetObjectId}` as `${string}::${string}`);
      if (!target) continue;

      const targetObjectName = relation.targetObjectName?.trim() || target.obj.name;
      const nextNavigationPath: NavigationPath = [
        ...group.navigationPath,
        {
          objectName: targetObjectName,
          cardinalityName: relation.cardinality,
          relationLabel: relation.label,
          sourceObjectName: current.obj.name,
        },
      ];

      const targetLinkedPeriodFilter = getLinkedPeriodFilterFromDefaultDateFiltering(target.obj.defaultDateFiltering);
      const targetLinkedDateFilterMode = hasReportPeriodVariables()
        ? 'period'
        : hasReportSingleDateVariable()
        ? 'day'
        : undefined;
      const targetCanInsert = target.obj.defaultDateFiltering === 'none'
        || (!!targetLinkedPeriodFilter && !!targetLinkedDateFilterMode);

      upsertLinked({
        key: `${target.theme.id}::${target.obj.id}`,
        themeId: target.theme.id,
        themeName: target.theme.name,
        objectId: target.obj.id,
        objectName: target.obj.name,
        linkCardinality: relation.cardinalityFrom ?? relation.cardinality,
        navigationPath: nextNavigationPath,
        canInsert: targetCanInsert,
        linkedPeriodFilter: targetLinkedPeriodFilter,
        linkedDateFilterMode: targetLinkedDateFilterMode,
      });
    }

    for (const sourceEntry of objectByKey.values()) {
      const inboundRelation = (sourceEntry.obj.relations ?? []).find(
        (relation) =>
          relation.targetThemeId === group.themeId
          && relation.targetObjectId === group.objectId
          && !isSingleRelationCardinality(relation.cardinalityFrom)
      );

      if (!inboundRelation) continue;

      const nextNavigationPath: NavigationPath = [
        ...group.navigationPath,
        {
          objectName: sourceEntry.obj.name,
          cardinalityName: inboundRelation.cardinality,
          relationLabel: inboundRelation.label,
          sourceObjectName: current.obj.name,
        },
      ];

      const sourceLinkedPeriodFilter = getLinkedPeriodFilterFromDefaultDateFiltering(sourceEntry.obj.defaultDateFiltering);
      const sourceLinkedDateFilterMode = hasReportPeriodVariables()
        ? 'period'
        : hasReportSingleDateVariable()
        ? 'day'
        : undefined;
      const sourceCanInsert = sourceEntry.obj.defaultDateFiltering === 'none'
        || (!!sourceLinkedPeriodFilter && !!sourceLinkedDateFilterMode);

      upsertLinked({
        key: `${sourceEntry.theme.id}::${sourceEntry.obj.id}`,
        themeId: sourceEntry.theme.id,
        themeName: sourceEntry.theme.name,
        objectId: sourceEntry.obj.id,
        objectName: sourceEntry.obj.name,
        linkCardinality: inboundRelation.cardinalityFrom ?? inboundRelation.cardinality,
        navigationPath: nextNavigationPath,
        canInsert: sourceCanInsert,
        linkedPeriodFilter: sourceLinkedPeriodFilter,
        linkedDateFilterMode: sourceLinkedDateFilterMode,
      });
    }

    return Array.from(linkedByKey.values()).sort((a, b) => a.objectName.localeCompare(b.objectName, 'fr', { sensitivity: 'base' }));
  };

  const openLinkedMultiCardinalityInsertion = (
    linkedObject: LinkedMultiCardinalityObject,
    mode: 'selection' | 'operation' | 'reportDate'
  ) => {
    const theme = dataStructure.find((candidate) => candidate.id === linkedObject.themeId);
    const obj = theme?.objects.find((candidate) => candidate.id === linkedObject.objectId);
    if (!theme || !obj) return;

    setPendingObjectInsertion({
      themeId: linkedObject.themeId,
      themeName: linkedObject.themeName,
      objectId: linkedObject.objectId,
      objectName: linkedObject.objectName,
      cardinality: linkedObject.linkCardinality,
      mode: mode === 'selection' ? 'special' : mode === 'operation' ? 'aggregation' : 'detailed',
      isApplicable: !!(obj.applicationDate || obj.isApplicable),
      applicationDateMandatory: !!obj.applicationDateConfig?.mandatory,
      applicationDateRequirementMode: obj.applicationDateConfig?.requirementMode ?? 'day',
      smartObjects: obj.smartObjects,
      navigationPath: linkedObject.navigationPath,
      ownObjectOnly: true,
      linkedPeriodFilter: linkedObject.linkedPeriodFilter,
      linkedDateFilterMode: linkedObject.linkedDateFilterMode,
    });

    setLinkedMultiCardinalityInsertionTarget(null);
    setLinkedMultiCardinalityDialogGroup(null);
    setObjectInsertionDialogOpen(true);
  };

  const isObjectLinkedToCollaborateur = (themeId: string, objectId: string) => {
    const objectByKey = new Map(
      dataStructure.flatMap((theme) =>
        theme.objects.map((obj) => [`${theme.id}::${obj.id}`, { themeId: theme.id, obj }] as const)
      )
    );

    const queue: Array<{ themeId: string; objectId: string }> = [{ themeId, objectId }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      const currentKey = `${current.themeId}::${current.objectId}`;
      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      const found = objectByKey.get(currentKey as `${string}::${string}`);
      if (!found) continue;

      if (found.obj.id === 'collaborateur' || found.obj.name.trim().toLocaleLowerCase() === 'collaborateur') {
        return true;
      }

      for (const relation of found.obj.relations ?? []) {
        if (!isSingleRelationCardinality(relation.cardinality)) continue;
        const targetKey = `${relation.targetThemeId}::${relation.targetObjectId}`;
        if (!visited.has(targetKey)) {
          queue.push({ themeId: relation.targetThemeId, objectId: relation.targetObjectId });
        }
      }

      for (const [sourceKey, sourceEntry] of objectByKey.entries()) {
        if (visited.has(sourceKey)) continue;

        const inboundRelation = (sourceEntry.obj.relations ?? []).find(
          (relation) =>
            relation.targetThemeId === current.themeId
            && relation.targetObjectId === current.objectId
            && isSingleRelationCardinality(relation.cardinalityFrom)
        );

        if (!inboundRelation) continue;
        queue.push({ themeId: sourceEntry.themeId, objectId: sourceEntry.obj.id });
      }
    }

    return false;
  };

  const mainObjectDefinition = useMemo(() => {
    if (!mainObject) return null;
    const theme = dataStructure.find((candidate) => candidate.id === mainObject.themeId);
    return theme?.objects.find((candidate) => candidate.id === mainObject.objectId) ?? null;
  }, [mainObject]);

  const mainObjectTemporalMode: ReportTemporalContext['mode'] = 'period';
  const reportDate = reportTemporalContext.reportDate;
  const reportPeriodStartDate = reportTemporalContext.periodStartDate ?? reportTemporalContext.reportDate;
  const reportPeriodEndDate = reportTemporalContext.periodEndDate ?? reportTemporalContext.reportDate;
  const collaboratorStatusReferenceDate = reportPeriodEndDate;

  const collaboratorTargetOptions = useMemo(() => {
    if (!mainObjectDefinition) return [] as CollaboratorTargetOption[];

    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .trim();

    const collaboratorRelations = (mainObjectDefinition.relations ?? [])
      .filter((relation) => normalize(relation.targetObjectName) === 'collaborateur')
      .map((relation) => ({
        key: `${relation.targetThemeId}:${relation.targetObjectId}:${relation.label}`,
        label: relation.label || relation.targetObjectName,
        isMainCollaborator: !!relation.isMainCollaborator,
      }));

    const isMainObjectCollaborateur =
      normalize(mainObjectDefinition.id) === 'collaborateur'
      || normalize(mainObjectDefinition.name) === 'collaborateur';

    if (isMainObjectCollaborateur) {
      collaboratorRelations.unshift({
        key: `${mainObjectDefinition.id}:self:collaborateur`,
        label: 'Collaborateur',
        isMainCollaborator: true,
      });
    }

    const byLabel = new Map<string, CollaboratorTargetOption>();
    for (const relation of collaboratorRelations) {
      const normalizedLabel = normalize(relation.label);
      const existing = byLabel.get(normalizedLabel);
      if (!existing) {
        byLabel.set(normalizedLabel, relation);
        continue;
      }

      if (relation.isMainCollaborator && !existing.isMainCollaborator) {
        byLabel.set(normalizedLabel, relation);
      }
    }

    return Array.from(byLabel.values())
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [mainObjectDefinition]);

  useEffect(() => {
    if (collaboratorTargetOptions.length === 0) {
      setSelectedCollaboratorTarget('');
      return;
    }

    setSelectedCollaboratorTarget((previous) => {
      if (previous && collaboratorTargetOptions.some((option) => option.label === previous)) {
        return previous;
      }

      const preferred = collaboratorTargetOptions.find((option) => option.isMainCollaborator);
      return preferred?.label ?? collaboratorTargetOptions[0].label;
    });
  }, [collaboratorTargetOptions]);

  const contractTypeEnumValues = useMemo(() => {
    const byNormalizedValue = new Map<string, string>();
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .trim();

    for (const theme of dataStructure) {
      for (const obj of theme.objects) {
        for (const attr of obj.attributes) {
          const normalizedId = normalize(attr.id);
          const normalizedName = normalize(attr.name);
          const isContractTypeAttribute = normalizedId === 'type-de-contrat' || normalizedName === 'type de contrat';
          if (!isContractTypeAttribute || !attr.enumValues || attr.enumValues.length === 0) continue;

          for (const enumValue of attr.enumValues) {
            const key = normalize(enumValue);
            if (!key || byNormalizedValue.has(key)) continue;
            byNormalizedValue.set(key, enumValue);
          }
        }
      }
    }

    return Array.from(byNormalizedValue.values())
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, []);

  const getReportColumnLikeLabel = (attr: SelectedAttribute) => {
    const baseName = attr.columnName || attr.attributeName;
    if (attr.insertionType === 'conditional' || attr.insertionType === 'calculated') {
      return baseName;
    }

    const path = attr.navigationPath ?? [];
    const groupTitle = (() => {
      if (path.length === 0) return attr.objectName;

      const firstStep = path[0];
      const rootRelationLabel = firstStep.relationLabel?.trim() || firstStep.objectName?.trim() || '';

      if (!rootRelationLabel || rootRelationLabel === attr.objectName) {
        return attr.objectName;
      }

      return `${attr.objectName} · ${rootRelationLabel}`;
    })();

    if (!groupTitle) return baseName;
    return `${baseName} – ${groupTitle}`;
  };

  const reportDateColumnAttributes = useMemo(
    () => selectedAttributes.filter((attr) => attr.attributeType === 'date'),
    [selectedAttributes]
  );

  const reportDateColumnOptions = useMemo(() => {
    return reportDateColumnAttributes
      .map((attr) => ({
        id: attr.id,
        label: getReportColumnLikeLabel(attr),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [reportDateColumnAttributes]);

  const isReportInDayMode = mainObjectDefinition?.defaultDateFiltering === 'chooseOne';

  useEffect(() => {
    if (collaboratorContractDateMode !== 'reportColumn') return;

    setSelectedCollaboratorContractDateColumnId((previous) => {
      if (previous && reportDateColumnOptions.some((option) => option.id === previous)) {
        return previous;
      }

      return reportDateColumnOptions[0]?.id ?? '';
    });
  }, [collaboratorContractDateMode, reportDateColumnOptions]);

  useEffect(() => {
    if (!isReportInDayMode) return;

    if (collaboratorContractDateMode === 'reportStart' || collaboratorContractDateMode === 'reportColumn') {
      setCollaboratorContractDateMode('reportEnd');
      setSelectedCollaboratorContractDateColumnId('');
    }
  }, [isReportInDayMode, collaboratorContractDateMode]);

  const normalizeObjectToken = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();

  const contractPosteObjectRefs = useMemo(() => {
    const allObjects = dataStructure.flatMap((theme) =>
      theme.objects.map((obj) => ({ themeId: theme.id, themeName: theme.name, objectId: obj.id, objectName: obj.name }))
    );

    const findByObjectType = (type: 'contrat' | 'poste') =>
      allObjects.find((entry) => {
        const normalizedId = normalizeObjectToken(entry.objectId);
        const normalizedName = normalizeObjectToken(entry.objectName);

        if (type === 'contrat') {
          return normalizedId === 'contrats'
            || normalizedId === 'contrat'
            || normalizedName === 'contrats'
            || normalizedName === 'contrat'
            || normalizedName.includes('contrat');
        }

        return normalizedId === 'postes'
          || normalizedId === 'poste'
          || normalizedName === 'postes'
          || normalizedName === 'poste'
          || normalizedName.includes('poste');
      }) ?? null;

    return {
      contrat: findByObjectType('contrat'),
      poste: findByObjectType('poste'),
    };
  }, []);

  const resolveContractPosteLotDateReference = (
    mode: CollaboratorContractDateMode,
    dateColumnId?: string
  ): DateReference => {
    if (mode === 'today') {
      return { type: 'custom', customDate: getTodayIsoDate() };
    }

    if (mode === 'reportColumn') {
      const resolvedColumnId = dateColumnId || reportDateColumnOptions[0]?.id;
      if (resolvedColumnId) {
        return { type: 'attribute', attributeId: resolvedColumnId };
      }
    }

    const reportStart = reportChosenPeriodStart || reportTemporalContext.periodStartDate || reportTemporalContext.reportDate;
    const reportEnd = isReportInDayMode
      ? (reportChosenDate || reportTemporalContext.reportDate)
      : (reportChosenPeriodEnd || reportTemporalContext.periodEndDate || reportTemporalContext.reportDate);

    if (mode === 'reportStart') {
      return { type: 'custom', customDate: reportStart };
    }

    return { type: 'custom', customDate: reportEnd };
  };

  const getContractPosteLotDateLabel = (
    mode: CollaboratorContractDateMode,
    dateColumnId?: string
  ) => {
    if (mode === 'today') return 'Date du jour';
    if (mode === 'reportStart') return isReportInDayMode ? 'Date du rapport' : 'Date début du rapport';
    if (mode === 'reportEnd') return isReportInDayMode ? 'Date du rapport' : 'Date fin du rapport';

    const selectedColumn = reportDateColumnOptions.find((option) => option.id === dateColumnId);
    return `Colonne date du rapport${selectedColumn ? ` (${selectedColumn.label})` : ''}`;
  };

  const getDefaultDateFilteringAttribute = (
    sourceThemeId: string,
    sourceObjectId: string,
    availableAttributes: AvailableObjectAttribute[],
    attributeId: string,
  ) => {
    return availableAttributes.find(
      (attr) =>
        attr.sourceThemeId === sourceThemeId
        && attr.sourceObjectId === sourceObjectId
        && attr.relativeNavigationPath.length === 0
        && attr.type === 'date'
        && attr.id === attributeId
    );
  };

  const buildDefaultDateFilteringConfig = (
    sourceThemeId: string,
    sourceObjectId: string,
    availableAttributes: AvailableObjectAttribute[],
    defaultDateFiltering: DefaultDateFiltering | undefined,
    temporalContext: ReportTemporalContext,
    preferredDateAttributeIds?: { start?: string; end?: string },
  ) => {
    if (!defaultDateFiltering || defaultDateFiltering === 'none') {
      return undefined;
    }

    const createDateCondition = (
      attribute: AvailableObjectAttribute,
      operator: 'greaterOrEqual' | 'lessOrEqual' | 'equals',
      value: string,
    ) => ({
      attributeId: `${AUTO_FILTER_COLUMN_PREFIX}${attribute.id}`,
      attributeName: `${getAutoFilterAttributeDisplayName(attribute)} [filtre auto]`,
      attributeType: 'date' as const,
      operator,
      value,
      valueType: 'fixed' as const,
    });

    const createDateReferenceCondition = (
      attribute: AvailableObjectAttribute,
      operator: 'greaterOrEqual' | 'lessOrEqual' | 'equals',
      referenceAttributeId: string,
      referenceAttributeName: string,
    ) => ({
      attributeId: `${AUTO_FILTER_COLUMN_PREFIX}${attribute.id}`,
      attributeName: `${getAutoFilterAttributeDisplayName(attribute)} [filtre auto]`,
      attributeType: 'date' as const,
      operator,
      value: '',
      valueType: 'attribute' as const,
      referenceAttributeId,
      referenceAttributeName,
    });

    if (defaultDateFiltering === 'chooseOne') {
      const fallbackDateAttr = availableAttributes.find(
        (attr) =>
          attr.sourceThemeId === sourceThemeId
          && attr.sourceObjectId === sourceObjectId
          && attr.relativeNavigationPath.length === 0
          && attr.type === 'date'
          && preferredDateAttributeIds?.start
          && attr.id === preferredDateAttributeIds.start
      ) ?? availableAttributes.find(
        (attr) =>
          attr.sourceThemeId === sourceThemeId
          && attr.sourceObjectId === sourceObjectId
          && attr.relativeNavigationPath.length === 0
          && attr.type === 'date'
      );

      if (!fallbackDateAttr) return undefined;

      return {
        groups: [{
          logicalOperator: 'ET' as const,
          conditions: [
            createDateReferenceCondition(
              fallbackDateAttr,
              'equals',
              REPORT_DATE_VARIABLE_ID,
              REPORT_DATE_VARIABLE_LABEL,
            ),
          ],
        }],
      };
    }

    if (defaultDateFiltering === 'choosePeriod') {
      const dateAttributes = availableAttributes.filter(
        (attr) =>
          attr.sourceThemeId === sourceThemeId
          && attr.sourceObjectId === sourceObjectId
          && attr.relativeNavigationPath.length === 0
          && attr.type === 'date'
      );

      const preferredStart = preferredDateAttributeIds?.start
        ? dateAttributes.find((attr) => attr.id === preferredDateAttributeIds.start)
        : undefined;
      const preferredEnd = preferredDateAttributeIds?.end
        ? dateAttributes.find((attr) => attr.id === preferredDateAttributeIds.end)
        : undefined;
      const firstDateAttribute = preferredStart ?? dateAttributes[0];
      if (!firstDateAttribute) return undefined;
      const secondDateAttribute = preferredEnd ?? dateAttributes[1] ?? firstDateAttribute;

      return {
        groups: [{
          logicalOperator: 'ET' as const,
          conditions: [
            createDateReferenceCondition(
              firstDateAttribute,
              'greaterOrEqual',
              REPORT_PERIOD_START_VARIABLE_ID,
              REPORT_PERIOD_START_VARIABLE_LABEL,
            ),
            createDateReferenceCondition(
              secondDateAttribute,
              'lessOrEqual',
              REPORT_PERIOD_END_VARIABLE_ID,
              REPORT_PERIOD_END_VARIABLE_LABEL,
            ),
          ],
        }],
      };
    }

    const conditions: FilterGroup['conditions'] = [];
    const dateStart = temporalContext.chosenPeriodStart ?? temporalContext.periodStartDate ?? temporalContext.reportDate;
    const dateEnd = temporalContext.chosenPeriodEnd ?? temporalContext.periodEndDate ?? temporalContext.reportDate;

    const firstAttr = getDefaultDateFilteringAttribute(
      sourceThemeId,
      sourceObjectId,
      availableAttributes,
      defaultDateFiltering.attrDate1 ?? ''
    );
    if (firstAttr) {
      conditions.push(
        createDateReferenceCondition(
          firstAttr,
          'greaterOrEqual',
          REPORT_PERIOD_START_VARIABLE_ID,
          REPORT_PERIOD_START_VARIABLE_LABEL,
        )
      );
    }

    const secondAttr = getDefaultDateFilteringAttribute(
      sourceThemeId,
      sourceObjectId,
      availableAttributes,
      defaultDateFiltering.attrDate2 ?? ''
    );
    if (secondAttr) {
      conditions.push(
        createDateReferenceCondition(
          secondAttr,
          'lessOrEqual',
          REPORT_PERIOD_END_VARIABLE_ID,
          REPORT_PERIOD_END_VARIABLE_LABEL,
        )
      );
    }

    if (conditions.length === 0) return undefined;

    return {
      groups: [{
        logicalOperator: 'ET' as const,
        conditions,
      }],
    };
  };

  const applyMainObjectDefaultDateFiltering = (
    sourceThemeId: string,
    sourceObjectId: string,
    availableAttributes: AvailableObjectAttribute[],
    defaultDateFiltering: DefaultDateFiltering | undefined,
    temporalContext: ReportTemporalContext,
    preferredDateAttributeIds?: { start?: string; end?: string },
  ) => {
    const nextFilterConfig = buildDefaultDateFilteringConfig(
      sourceThemeId,
      sourceObjectId,
      availableAttributes,
      defaultDateFiltering,
      temporalContext,
      preferredDateAttributeIds,
    );
    setGlobalFilterGroups(nextFilterConfig?.groups);
  };

  const validateReportTemporalContext = () => {
    if (!reportPeriodStartDate || !reportPeriodEndDate) {
      window.alert('Veuillez renseigner une date de début et une date de fin pour la période du rapport.');
      return false;
    }

    if (reportPeriodStartDate > reportPeriodEndDate) {
      window.alert('La date de début de période doit être antérieure ou égale à la date de fin.');
      return false;
    }

    return true;
  };

  const getDefaultSortAttributeId = (attributes: AvailableObjectAttribute[]) => {
    const dateAttribute = attributes.find((attr) => attr.type === 'date');
    if (dateAttribute) return dateAttribute.id;

    const numberAttribute = attributes.find((attr) => attr.type === 'number');
    if (numberAttribute) return numberAttribute.id;

    return attributes[0]?.id;
  };

  const getObjectAttributes = (themeId: string, objectId: string) => {
    const themeById = new Map<string, (typeof dataStructure)[number]>(dataStructure.map((theme) => [theme.id, theme] as const));
    const objectByKey = new Map<string, (typeof dataStructure)[number]['objects'][number]>(
      dataStructure.flatMap((theme) =>
        theme.objects.map((obj) => [`${theme.id}::${obj.id}`, obj] as const)
      )
    );

    const isSingleCardinality = (cardinality?: string) => {
      if (!cardinality) return true;
      return !cardinality.includes('n');
    };

    const rootKey = `${themeId}::${objectId}`;
    const rootObject = objectByKey.get(rootKey);
    if (!rootObject) return [];

    const collected: AvailableObjectAttribute[] = [];
    const collectedById = new Map<string, AvailableObjectAttribute>();

    const collect = (
      currentThemeId: string,
      currentObjectId: string,
      relationPath: string[],
      relativeNavigationPath: NavigationPath,
      shouldAutoSelect: boolean,
      recursiveAutoEnabled: boolean,
      branchVisited: Set<string>
    ) => {
      const currentKey = `${currentThemeId}::${currentObjectId}`;
      if (branchVisited.has(currentKey)) return;

      const currentObject = objectByKey.get(currentKey);
      const currentTheme = themeById.get(currentThemeId);
      if (!currentObject) return;

      const nextBranchVisited = new Set(branchVisited);
      nextBranchVisited.add(currentKey);

      for (const attr of currentObject.attributes) {
        const navigationSignature = relativeNavigationPath
          .map((step) => `${step.sourceObjectName ?? ''}:${step.relationLabel ?? ''}:${step.objectName}`)
          .join('>');

        const compositeId = relationPath.length > 0
          ? `${currentKey}::${attr.id}::${navigationSignature}`
          : attr.id;

        const existing = collectedById.get(compositeId);
        const shouldMarkAsDefault = !!attr.magicSel;
        const shouldMarkForAutoInsert = shouldAutoSelect && !!attr.magicSel;
        if (existing) {
          if (shouldMarkAsDefault && !existing.smartSel) {
            existing.smartSel = true;
          }
          if (shouldMarkForAutoInsert && !existing.autoSmartSel) {
            existing.autoSmartSel = true;
          }
          continue;
        }

        const nextAttribute: AvailableObjectAttribute = {
          id: compositeId,
          name: relationPath.length > 0
            ? `${relationPath.join(' > ')} > ${attr.name}`
            : attr.name,
          rawName: attr.name,
          description: attr.description,
          tooltip: attr.tooltip,
          type: attr.type,
          magicSel: attr.magicSel,
          smartSel: shouldMarkAsDefault,
          autoSmartSel: shouldMarkForAutoInsert,
          sourceObjectSupportsApplicable: !!(currentObject.applicationDate || currentObject.isApplicable),
          sourceObjectApplicationDateMandatory: !!currentObject.applicationDateConfig?.mandatory,
          sourceObjectApplicationDateRequirementMode: currentObject.applicationDateConfig?.requirementMode ?? 'day',
          sourceThemeId: currentThemeId,
          sourceThemeName: currentTheme?.name ?? currentThemeId,
          sourceObjectId: currentObjectId,
          sourceObjectName: currentObject.name,
          relativeNavigationPath,
        };

        collected.push(nextAttribute);
        collectedById.set(compositeId, nextAttribute);
      }

      for (const relation of currentObject.relations ?? []) {
        if (!isSingleCardinality(relation.cardinality)) continue;

        const isFromRoot = relationPath.length === 0;
        const nextShouldAutoSelect = isFromRoot
          ? (!!relation.magicSelToTarget || !!relation.recursiveMagicSel)
          : (recursiveAutoEnabled && !!relation.recursiveMagicSel);
        const nextRecursiveAutoEnabled = isFromRoot
          ? !!relation.recursiveMagicSel
          : (recursiveAutoEnabled && !!relation.recursiveMagicSel);

        const nextNavigationPath = [
          ...relativeNavigationPath,
          {
            objectName: relation.targetObjectName,
            cardinalityName: relation.cardinality,
            relationLabel: relation.label,
            sourceObjectName: currentObject.name,
          },
        ];

        collect(
          relation.targetThemeId,
          relation.targetObjectId,
          [...relationPath, relation.targetObjectName],
          nextNavigationPath,
          nextShouldAutoSelect,
          nextRecursiveAutoEnabled,
          nextBranchVisited
        );
      }

      // Inbound traversal: find objects that point TO the current object via single cardinalityFrom
      for (const inboundTheme of themeById.values()) {
        for (const inboundObj of inboundTheme.objects) {
          const inboundKey = `${inboundTheme.id}::${inboundObj.id}`;
          if (nextBranchVisited.has(inboundKey)) continue;

          const inboundRelation = (inboundObj.relations ?? []).find(
            (relation) =>
              relation.targetThemeId === currentThemeId
              && relation.targetObjectId === currentObjectId
              && isSingleCardinality(relation.cardinalityFrom)
          );

          if (!inboundRelation) continue;

          const isFromRoot = relationPath.length === 0;
          const nextShouldAutoSelect = isFromRoot
            ? (!!inboundRelation.magicSelFromTarget || !!inboundRelation.recursiveMagicSel)
            : (recursiveAutoEnabled && !!inboundRelation.recursiveMagicSel);
          const nextRecursiveAutoEnabled = isFromRoot
            ? !!inboundRelation.recursiveMagicSel
            : (recursiveAutoEnabled && !!inboundRelation.recursiveMagicSel);

          const nextNavigationPath = [
            ...relativeNavigationPath,
            {
              objectName: inboundObj.name,
              cardinalityName: inboundRelation.cardinality,
              relationLabel: inboundRelation.label,
              sourceObjectName: currentObject.name,
            },
          ];

          collect(
            inboundTheme.id,
            inboundObj.id,
            [...relationPath, inboundObj.name],
            nextNavigationPath,
            nextShouldAutoSelect,
            nextRecursiveAutoEnabled,
            nextBranchVisited
          );
        }
      }
    };

    collect(themeId, objectId, [], [], true, true, new Set<string>());

    return collected;
  };

  const getDirectMagicAttributes = (themeId: string, objectId: string) => {
    const theme = dataStructure.find((t) => t.id === themeId);
    const obj = theme?.objects.find((o) => o.id === objectId);
    if (!theme || !obj) return [] as AvailableObjectAttribute[];

    return obj.attributes
      .filter((attr) => !!attr.magicSel)
      .map((attr) => ({
        id: attr.id,
        name: attr.name,
        rawName: attr.name,
        description: attr.description,
        tooltip: attr.tooltip,
        type: attr.type,
        magicSel: attr.magicSel,
        smartSel: !!attr.magicSel,
        sourceObjectSupportsApplicable: !!(obj.applicationDate || obj.isApplicable),
        sourceObjectApplicationDateMandatory: !!obj.applicationDateConfig?.mandatory,
        sourceObjectApplicationDateRequirementMode: obj.applicationDateConfig?.requirementMode ?? 'day',
        sourceThemeId: theme.id,
        sourceThemeName: theme.name,
        sourceObjectId: obj.id,
        sourceObjectName: obj.name,
        relativeNavigationPath: [],
      }));
  };

  const getOwnObjectAttributes = (themeId: string, objectId: string) => {
    const theme = dataStructure.find((t) => t.id === themeId);
    const obj = theme?.objects.find((o) => o.id === objectId);
    if (!theme || !obj) return [] as AvailableObjectAttribute[];

    return obj.attributes.map((attr) => ({
      id: attr.id,
      name: attr.name,
      rawName: attr.name,
      description: attr.description,
      tooltip: attr.tooltip,
      type: attr.type,
      magicSel: attr.magicSel,
      smartSel: !!attr.magicSel,
      sourceObjectSupportsApplicable: !!(obj.applicationDate || obj.isApplicable),
      sourceObjectApplicationDateMandatory: !!obj.applicationDateConfig?.mandatory,
      sourceObjectApplicationDateRequirementMode: obj.applicationDateConfig?.requirementMode ?? 'day',
      sourceThemeId: theme.id,
      sourceThemeName: theme.name,
      sourceObjectId: obj.id,
      sourceObjectName: obj.name,
      relativeNavigationPath: [],
    }));
  };

  const sortAvailableObjectAttributes = (attributes: AvailableObjectAttribute[]) =>
    [...attributes].sort((a, b) => a.rawName.localeCompare(b.rawName, 'fr', { sensitivity: 'base' }));

  const contractPosteLotAttributeCatalog = useMemo(() => {
    const contractRef = contractPosteObjectRefs.contrat;
    const posteRef = contractPosteObjectRefs.poste;
    if (!contractRef || !posteRef || !mainObject || !selectedCollaboratorTarget) {
      return {
        sections: [] as ContractPosteLotAttributeSection[],
        flatOptions: [] as ContractPosteLotAttributeOption[],
        tileNodes: [] as ContractPosteTargetTileNode[],
      };
    }

    const objectByKey = new Map(
      dataStructure.flatMap((theme) =>
        theme.objects.map((obj) => [`${theme.id}::${obj.id}`, { theme, obj }] as const)
      )
    );

    const getObjectRef = (themeId: string, objectId: string) => {
      const found = objectByKey.get(`${themeId}::${objectId}` as `${string}::${string}`);
      if (!found) return null;
      return {
        themeId,
        themeName: found.theme.name,
        objectId,
        objectName: found.obj.name,
      };
    };

    const allObjectRefs = dataStructure.flatMap((theme) =>
      theme.objects.map((obj) => ({
        themeId: theme.id,
        themeName: theme.name,
        objectId: obj.id,
        objectName: obj.name,
      }))
    );

    const findObjectRef = (...tokens: string[]) => allObjectRefs.find((entry) => {
      const normalizedId = normalizeObjectToken(entry.objectId);
      const normalizedName = normalizeObjectToken(entry.objectName);
      return tokens.some((token) => normalizedId === token || normalizedName === token);
    }) ?? null;

    const collaboratorRef = findObjectRef('collaborateur');
    const departmentRef = findObjectRef('departement');
    const establishmentRef = findObjectRef('etablissement');
    const companyRef = findObjectRef('entreprise');
    if (!collaboratorRef) {
      return {
        sections: [] as ContractPosteLotAttributeSection[],
        flatOptions: [] as ContractPosteLotAttributeOption[],
        tileNodes: [] as ContractPosteTargetTileNode[],
      };
    }

    const normalizedMainObjectId = normalizeObjectToken(mainObject.objectId);
    const normalizedMainObjectName = normalizeObjectToken(mainObject.objectName);
    const isMainObjectCollaborateur =
      normalizedMainObjectId === 'collaborateur'
      || normalizedMainObjectName === 'collaborateur';

    const baseNavigationPath: NavigationPath = isMainObjectCollaborateur
      ? []
      : [
          {
            objectName: 'Collaborateur',
            cardinalityName: '1',
            relationLabel: selectedCollaboratorTarget,
            sourceObjectName: mainObject.objectName,
          },
        ];

    const contractNavigationPath: NavigationPath = [
      ...baseNavigationPath,
      {
        objectName: contractRef.objectName,
        cardinalityName: 'n',
        relationLabel: 'Contrat',
        sourceObjectName: 'Collaborateur',
      },
    ];

    const posteNavigationPath: NavigationPath = [
      ...contractNavigationPath,
      {
        objectName: posteRef.objectName,
        cardinalityName: 'n',
        relationLabel: 'Poste',
        sourceObjectName: contractRef.objectName,
      },
    ];

    const buildStep = (
      objectName: string,
      cardinalityName: string,
      relationLabel: string,
      sourceObjectName: string,
    ) => ({
      objectName,
      cardinalityName,
      relationLabel,
      sourceObjectName,
    });

    const sortContractPosteOptions = (attributes: ContractPosteLotAttributeOption[]) =>
      [...attributes].sort((a, b) => a.rawName.localeCompare(b.rawName, 'fr', { sensitivity: 'base' }));

    const buildSectionAttributes = (
      sourceRef: NonNullable<ReturnType<typeof getObjectRef>>,
      lotBaseNavigationPath: NavigationPath,
      sectionKey: string,
      sectionLabel: string,
    ) => {
      const found = objectByKey.get(`${sourceRef.themeId}::${sourceRef.objectId}` as `${string}::${string}`);
      if (!found) return [] as ContractPosteLotAttributeOption[];

      return sortContractPosteOptions(
        found.obj.attributes.map((attr) => ({
          id: attr.id,
          name: attr.name,
          rawName: attr.name,
          description: attr.description,
          tooltip: attr.tooltip,
          type: attr.type,
          magicSel: attr.magicSel,
          smartSel: !!attr.magicSel,
          autoSmartSel: !!attr.magicSel,
          sourceObjectSupportsApplicable: !!(found.obj.applicationDate || found.obj.isApplicable),
          sourceObjectApplicationDateMandatory: !!found.obj.applicationDateConfig?.mandatory,
          sourceObjectApplicationDateRequirementMode: found.obj.applicationDateConfig?.requirementMode ?? 'day',
          sourceThemeId: sourceRef.themeId,
          sourceThemeName: sourceRef.themeName,
          sourceObjectId: sourceRef.objectId,
          sourceObjectName: sourceRef.objectName,
          relativeNavigationPath: [],
          lotBaseNavigationPath,
          sectionKey,
          sectionLabel,
        }))
      );
    };

    const createTileNode = (
      key: string,
      label: string,
      sourceRef: ReturnType<typeof getObjectRef> | null,
      lotBaseNavigationPath: NavigationPath,
      sectionLabelParts: string[],
      children: ContractPosteTargetTileNode[] = []
    ): ContractPosteTargetTileNode | null => {
      if (!sourceRef) {
        if (children.length === 0) return null;
        return { key, label, attributes: [], children };
      }

      const attributes = buildSectionAttributes(
        sourceRef,
        lotBaseNavigationPath,
        `${key}::${getNavigationPathSignature(lotBaseNavigationPath)}`,
        sectionLabelParts.join(' > '),
      );

      if (attributes.length === 0 && children.length === 0) {
        return null;
      }

      return { key, label, attributes, children };
    };

    const buildContractPath = (collaboratorPath: NavigationPath): NavigationPath => [
      ...collaboratorPath,
      buildStep(contractRef.objectName, 'n', 'Contrat', collaboratorRef.objectName),
    ];

    const buildPostePath = (collaboratorPath: NavigationPath): NavigationPath => [
      ...buildContractPath(collaboratorPath),
      buildStep(posteRef.objectName, 'n', 'Poste', contractRef.objectName),
    ];

    const buildDepartmentPath = (targetPostePath: NavigationPath): NavigationPath => (
      departmentRef
        ? [...targetPostePath, buildStep(departmentRef.objectName, '1', 'Département', posteRef.objectName)]
        : targetPostePath
    );

    const buildEstablishmentPath = (targetPostePath: NavigationPath): NavigationPath => (
      establishmentRef
        ? [...targetPostePath, buildStep(establishmentRef.objectName, '1', 'Etablissement', posteRef.objectName)]
        : targetPostePath
    );

    const buildCompanyPath = (targetPostePath: NavigationPath): NavigationPath => (
      establishmentRef && companyRef
        ? [...buildEstablishmentPath(targetPostePath), buildStep(companyRef.objectName, '1', 'Entreprise', establishmentRef.objectName)]
        : targetPostePath
    );

    const buildManagerPath = (targetPostePath: NavigationPath): NavigationPath => [
      ...targetPostePath,
      buildStep(collaboratorRef.objectName, '1', 'Manager', posteRef.objectName),
    ];

    const buildPosteNode = (
      collaboratorPath: NavigationPath,
      managerDepth: number,
      labelPath: string[],
    ): ContractPosteTargetTileNode | null => {
      const currentPostePath = managerDepth === 0 ? posteNavigationPath : buildPostePath(collaboratorPath);
      const children: ContractPosteTargetTileNode[] = [];

      const contractNode = createTileNode(
        'contrat',
        'Contrat',
        contractRef,
        managerDepth === 0 ? contractNavigationPath : buildContractPath(collaboratorPath),
        [...labelPath, 'Contrat'],
      );
      if (contractNode) children.push(contractNode);

      const departmentNode = createTileNode(
        'departement',
        'Département',
        departmentRef,
        buildDepartmentPath(currentPostePath),
        [...labelPath, 'Département'],
      );
      if (departmentNode) children.push(departmentNode);

      const companyNode = createTileNode(
        'entreprise',
        'Entreprise',
        companyRef,
        buildCompanyPath(currentPostePath),
        [...labelPath, 'Etablissement', 'Entreprise'],
      );

      const establishmentChildren = companyNode ? [companyNode] : [];
      const establishmentNode = createTileNode(
        'etablissement',
        'Etablissement',
        establishmentRef,
        buildEstablishmentPath(currentPostePath),
        [...labelPath, 'Etablissement'],
        establishmentChildren,
      );
      if (establishmentNode) children.push(establishmentNode);

      if (managerDepth < MAX_APPLICABLE_MANAGER_DEPTH) {
        const managerPath = buildManagerPath(currentPostePath);
        const managerChildren: ContractPosteTargetTileNode[] = [];

        const nestedPosteNode = buildPosteNode(
          managerPath,
          managerDepth + 1,
          [...labelPath, 'Manager', 'Postes'],
        );
        if (nestedPosteNode) managerChildren.push(nestedPosteNode);

        const managerNode = createTileNode(
          'manager',
          'Manager',
          collaboratorRef,
          managerPath,
          [...labelPath, 'Manager'],
          managerChildren,
        );
        if (managerNode) children.push(managerNode);
      }

      return createTileNode(
        'poste',
        'Postes',
        posteRef,
        currentPostePath,
        labelPath,
        children,
      );
    };

    const rootNode = buildPosteNode(baseNavigationPath, 0, ['Postes']);
    const tileNodes = rootNode ? [rootNode] : [];

    const sections: ContractPosteLotAttributeSection[] = [];
    const flatOptions: ContractPosteLotAttributeOption[] = [];
    const collectSections = (nodes: ContractPosteTargetTileNode[]) => {
      for (const node of nodes) {
        if (node.attributes.length > 0) {
          sections.push({
            key: node.attributes[0].sectionKey,
            label: node.attributes[0].sectionLabel,
            attributes: node.attributes,
          });
          flatOptions.push(...node.attributes);
        }

        if (node.children.length > 0) {
          collectSections(node.children);
        }
      }
    };

    collectSections(tileNodes);

    return { sections, flatOptions, tileNodes };
  }, [contractPosteObjectRefs, mainObject, selectedCollaboratorTarget]);

  const insertionLotDisplayLabels = new Map<string, string>();
  let insertionLotCounter = 1;
  for (const attr of selectedAttributes) {
    if (!attr.insertionLotId || insertionLotDisplayLabels.has(attr.insertionLotId)) continue;
    insertionLotDisplayLabels.set(
      attr.insertionLotId,
      `Lot ${insertionLotCounter} : ${attr.insertionLotLabel ?? 'Sans libellé'}`
    );
    insertionLotCounter += 1;
  }

  const getInsertionLotDisplayLabel = (lotId: string) => insertionLotDisplayLabels.get(lotId) ?? 'Lot';

  const buildContractPosteLotAttributes = ({
    collaboratorRelationLabel,
    insertionLotId,
    selectedAttributeKeys,
    dateMode,
    dateColumnId,
  }: {
    collaboratorRelationLabel: string;
    insertionLotId: string;
    selectedAttributeKeys: string[];
    dateMode: CollaboratorContractDateMode;
    dateColumnId?: string;
  }) => {
    if (!mainObject || !mainObjectLinkedToCollaborateur) return [] as SelectedAttribute[];

    const contractRef = contractPosteObjectRefs.contrat;
    const posteRef = contractPosteObjectRefs.poste;
    if (!contractRef || !posteRef) return [] as SelectedAttribute[];

    const selectedAttributeKeySet = new Set(selectedAttributeKeys);
    const resolvedDateColumnId = dateMode === 'reportColumn'
      ? (dateColumnId || reportDateColumnOptions[0]?.id)
      : undefined;
    const lotDateReference = resolveContractPosteLotDateReference(dateMode, resolvedDateColumnId);
    const lotDateLabel = getContractPosteLotDateLabel(dateMode, resolvedDateColumnId);

    const buildLotAttributes = (objectAttributes: ContractPosteLotAttributeOption[]) => objectAttributes
      .filter((attr) => selectedAttributeKeySet.has(
        getContractPosteLotAttributeKey(attr.sourceThemeId, attr.sourceObjectId, attr.id, attr.lotBaseNavigationPath)
      ))
      .map((attr) => buildSelectedAttribute({
        themeId: attr.sourceThemeId,
        themeName: attr.sourceThemeName,
        objectId: attr.sourceObjectId,
        objectName: attr.sourceObjectName,
        attributeId: attr.id,
        attributeName: attr.rawName,
        attributeType: attr.type,
        insertionType: 'applicable',
        isApplicable: true,
        dateReference: lotDateReference,
        navigationPath: [...attr.lotBaseNavigationPath, ...attr.relativeNavigationPath],
        insertionLotId,
        insertionLotLabel: collaboratorRelationLabel,
        insertionLotDateMode: dateMode,
        insertionLotDateColumnId: resolvedDateColumnId,
        insertionLotDateLabel: lotDateLabel,
      }));

    return buildLotAttributes(contractPosteLotAttributeCatalog.flatOptions);
  };

  const getMainObjectModeLabel = () => {
    if (!mainObjectConfig) return '';

    const aggregationLabel: Record<AggregationType, string> = {
      COUNT: 'Nombre',
      CONCAT: 'Concaténation',
      SUM: 'Somme',
      MIN: 'Minimum',
      MAX: 'Maximum',
      AVG: 'Moyenne',
    };

    switch (mainObjectConfig.insertionType) {
      case 'normal':
        return 'Liste détaillée';
      case 'first':
        return 'Valeur spéciale: première instance';
      case 'last':
        return 'Valeur spéciale: dernière instance';
      case 'applicable':
        return 'Valeur spéciale: instance applicable';
      case 'aggregation':
        return `Valeur spéciale: ${mainObjectConfig.aggregationType ? aggregationLabel[mainObjectConfig.aggregationType] : 'Agrégation'}`;
      default:
        return '';
    }
  };

  const handleMainObjectSelect = (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string
  ) => {
    const theme = dataStructure.find((t) => t.id === themeId);
    const obj = theme?.objects.find((o) => o.id === objectId);
    if (!obj) return;

    const objectAttributes = getObjectAttributes(themeId, objectId);
    const directObjectAttributes = objectAttributes.filter(
      (attr) =>
        attr.sourceThemeId === themeId
        && attr.sourceObjectId === objectId
        && attr.relativeNavigationPath.length === 0
    );
    const mainObjectHasMagicSel = directObjectAttributes.some((attr) => !!attr.magicSel);
    const defaultAttributes = mainObjectHasMagicSel
      ? objectAttributes.filter((attr) => !!attr.autoSmartSel)
      : directObjectAttributes;
    const mainObjectSupportsApplicable = !!(obj.applicationDate || obj.isApplicable);
    const mainObjectApplicationDateMandatory = !!obj.applicationDateConfig?.mandatory;
    const nextTemporalContext = createDefaultTemporalContext();

    const autoInserted = defaultAttributes.map((attr) =>
      buildSelectedAttribute({
        themeId: attr.sourceThemeId,
        themeName: attr.sourceThemeName,
        objectId: attr.sourceObjectId,
        objectName: attr.sourceObjectName,
        attributeId: attr.id,
        attributeName: attr.rawName,
        attributeType: attr.type,
        insertionType: attr.sourceObjectSupportsApplicable && attr.sourceObjectApplicationDateMandatory ? 'applicable' : 'normal',
        isApplicable: attr.sourceObjectSupportsApplicable && attr.sourceObjectApplicationDateMandatory,
        dateReference: attr.sourceObjectSupportsApplicable && attr.sourceObjectApplicationDateMandatory
          ? { type: 'today' }
          : undefined,
        navigationPath: attr.relativeNavigationPath,
      })
    );

    setMainObject({
      themeId,
      themeName,
      objectId,
      objectName,
    });
    setReportTemporalContext(nextTemporalContext);
    setMainObjectConfig(
      mainObjectSupportsApplicable
        ? (mainObjectApplicationDateMandatory
          ? {
              insertionType: 'applicable',
              dateReference: { type: 'today' },
              applyApplicableToday: true,
            }
          : { insertionType: 'normal' })
        : { insertionType: 'normal' }
    );
    setSelectingMainObject(false);
    setPendingMainObject(null);
    setPendingObjectInsertion(null);
    setObjectInsertionDialogOpen(false);
    setSelectedAttributes(autoInserted);
    setPendingInitialAvailableGroupsCollapse(true);

    // Initialise les dates choisies par défaut (sans prompt)
    const defaultChosenDate = nextTemporalContext.periodEndDate ?? nextTemporalContext.reportDate;
    const defaultPeriodStart = nextTemporalContext.periodStartDate ?? addMonthsIsoDate(nextTemporalContext.reportDate, -12);
    const defaultPeriodEnd = nextTemporalContext.periodEndDate ?? nextTemporalContext.reportDate;
    setReportChosenDate(defaultChosenDate);
    setReportChosenPeriodStart(defaultPeriodStart);
    setReportChosenPeriodEnd(defaultPeriodEnd);

    const ctxWithChosen: ReportTemporalContext = {
      ...nextTemporalContext,
      chosenDate: defaultChosenDate,
      chosenPeriodStart: defaultPeriodStart,
      chosenPeriodEnd: defaultPeriodEnd,
    };
    applyMainObjectDefaultDateFiltering(
      themeId,
      objectId,
      objectAttributes,
      obj.defaultDateFiltering,
      ctxWithChosen,
      {
        start: obj.applicationDateConfig?.startAttributeId,
        end: obj.applicationDateConfig?.endAttributeId,
      }
    );
  };

  const normalizeSmartText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .replace(/\[applicable\]/g, ' applicable ')
      .replace(/[_.>]/g, ' ')
      .replace(/['’]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const getSmartTokens = (value: string) => normalizeSmartText(value).split(' ').filter(Boolean);

  const isSmartTokenSubset = (needle: string, haystack: string) => {
    const needleTokens = getSmartTokens(needle);
    const haystackTokens = new Set(getSmartTokens(haystack));
    if (needleTokens.length === 0) return true;
    return needleTokens.every((token) => haystackTokens.has(token));
  };

  const matchSmartPathToAttribute = (attribute: AvailableObjectAttribute, columnPath: string) => {
    const columnParts = columnPath
      .split('.')
      .map((part) => part.trim())
      .filter(Boolean);
    if (columnParts.length === 0) return false;

    const requestedAttributeName = columnParts[columnParts.length - 1];
    if (!isSmartTokenSubset(requestedAttributeName, attribute.rawName)) {
      return false;
    }

    const requestedPath = columnParts.slice(0, -1);
    if (requestedPath.length === 0) {
      return true;
    }

    const pathSteps = (attribute.relativeNavigationPath ?? []).map((step) =>
      [step.relationLabel, step.objectName].filter(Boolean).join(' ')
    );

    if (requestedPath.length > pathSteps.length) {
      return false;
    }

    return requestedPath.every((requestedPart, index) => {
      const pathStep = pathSteps[index];
      return isSmartTokenSubset(requestedPart, pathStep);
    });
  };

  const resolveSmartPresetGlobalFilters = (
    smartObject: SmartObjectDefinition,
    availableAttributes: AvailableObjectAttribute[],
    presetSelectedAttributes: SelectedAttribute[]
  ): FilterGroup[] | undefined => {
    if (!smartObject.filters || smartObject.filters.groups.length === 0) {
      return undefined;
    }

    const todayDate = getTodayIsoDate();
    const groups = smartObject.filters.groups
      .map((filterGroup) => {
        const conditions: FilterGroup['conditions'] = filterGroup.conditions
          .map((condition) => {
            const matched = availableAttributes.find((attribute) =>
              matchSmartPathToAttribute(attribute, condition.attributePath)
            );
            if (!matched) return null;

            const selectedMatch = presetSelectedAttributes.find(
              (selectedAttribute) => selectedAttribute.attributeId === matched.id
            );

            const value = condition.value === 'dateDuJour' ? todayDate : condition.value;

            return {
              attributeId: selectedMatch?.id ?? matched.id,
              attributeName: selectedMatch
                ? getSelectedAttributeDisplayName(selectedMatch)
                : matched.rawName,
              attributeType: matched.type,
              operator: condition.operator,
              value,
              valueType: 'fixed' as const,
            };
          })
          .filter((condition): condition is NonNullable<typeof condition> => condition !== null);

        if (conditions.length === 0) return null;

        const nextGroup: FilterGroup = {
          logicalOperator: filterGroup.logicalOperator,
          conditions,
        };
        return nextGroup;
      })
      .filter((group): group is NonNullable<typeof group> => group !== null);

    return groups.length > 0 ? groups : undefined;
  };

  const getMainObjectSmartObjects = (): SmartObjectDefinition[] => {
    if (!mainObject) return [];
    const theme = dataStructure.find((candidate) => candidate.id === mainObject.themeId);
    const obj = theme?.objects.find((candidate) => candidate.id === mainObject.objectId);
    return obj?.smartObjects ?? [];
  };

  const applyMainObjectSmartPreset = (smartObject: SmartObjectDefinition) => {
    if (!mainObject) return;

    const todayIsoDate = getTodayIsoDate();
    const resolvedPresetStartDate = smartObject.setDateRapport?.dateDebutRapport
      ? parseRelativeTodayExpression(smartObject.setDateRapport.dateDebutRapport, todayIsoDate)
      : undefined;
    const resolvedPresetEndDate = smartObject.setDateRapport?.dateFinRapport
      ? parseRelativeTodayExpression(smartObject.setDateRapport.dateFinRapport, todayIsoDate)
      : undefined;

    if (resolvedPresetStartDate) {
      setReportChosenPeriodStart(resolvedPresetStartDate);
    }

    if (resolvedPresetEndDate) {
      setReportChosenPeriodEnd(resolvedPresetEndDate);
      setReportChosenDate(resolvedPresetEndDate);
    }

    if (resolvedPresetStartDate || resolvedPresetEndDate) {
      setReportTemporalContext((previous) => ({
        ...previous,
        reportDate: todayIsoDate,
        periodStartDate: resolvedPresetStartDate ?? previous.periodStartDate,
        periodEndDate: resolvedPresetEndDate ?? previous.periodEndDate,
        chosenDate: resolvedPresetEndDate ?? previous.chosenDate,
        chosenPeriodStart: resolvedPresetStartDate ?? previous.chosenPeriodStart,
        chosenPeriodEnd: resolvedPresetEndDate ?? previous.chosenPeriodEnd,
      }));
    }

    const availableAttributes = getObjectAttributes(mainObject.themeId, mainObject.objectId);
    const columnAttributeIds = Array.from(
      new Set(
        smartObject.columns.flatMap((columnPath) => {
          const matched = availableAttributes.find((attribute) =>
            matchSmartPathToAttribute(attribute, columnPath)
          );
          return matched ? [matched.id] : [];
        })
      )
    );

    const filterAttributeIds = Array.from(
      new Set(
        (smartObject.filters?.groups ?? []).flatMap((group) =>
          group.conditions.flatMap((condition) => {
            const matched = availableAttributes.find((attribute) =>
              matchSmartPathToAttribute(attribute, condition.attributePath)
            );
            return matched ? [matched.id] : [];
          })
        )
      )
    );

    const selectedAttributeIds = Array.from(
      new Set([...columnAttributeIds, ...filterAttributeIds])
    );

    if (selectedAttributeIds.length === 0) {
      alert('Aucune colonne ou attribut de filtre du preset n\'a pu être associé aux attributs disponibles.');
      return;
    }

    const presetAttributes = availableAttributes
      .filter((attribute) => selectedAttributeIds.includes(attribute.id))
      .map((attribute) =>
        buildSelectedAttribute({
          themeId: attribute.sourceThemeId,
          themeName: attribute.sourceThemeName,
          objectId: attribute.sourceObjectId,
          objectName: attribute.sourceObjectName,
          attributeId: attribute.id,
          attributeName: attribute.rawName,
          attributeType: attribute.type,
          insertionType: attribute.sourceObjectSupportsApplicable && attribute.sourceObjectApplicationDateMandatory ? 'applicable' : 'normal',
          isApplicable: attribute.sourceObjectSupportsApplicable && attribute.sourceObjectApplicationDateMandatory,
          dateReference: attribute.sourceObjectSupportsApplicable && attribute.sourceObjectApplicationDateMandatory
            ? { type: 'today' }
            : undefined,
          navigationPath: attribute.relativeNavigationPath,
        })
      );

    setSelectedAttributes(presetAttributes);
    setGlobalFilterGroups(
      resolveSmartPresetGlobalFilters(smartObject, availableAttributes, presetAttributes)
    );
  };

  const handleObjectInsert = (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string,
    cardinality: string,
    mode: 'detailed' | 'operation' | 'aggregation' | 'special',
    isApplicable?: boolean,
    navigationPath?: NavigationPath
  ) => {
    if (mode === 'operation') {
      const objectAttributes = getObjectAttributes(themeId, objectId);
      const smartAttributes = objectAttributes.filter((attr) => !!attr.smartSel);

      if (smartAttributes.length === 0) {
        alert('Aucun attribut de sélection intelligente disponible pour cet objet.');
        return;
      }

      const defaultSortAttributeId = getDefaultSortAttributeId(smartAttributes);
      if (!defaultSortAttributeId) {
        alert('Impossible de déterminer un attribut de tri pour l\'opération.');
        return;
      }

      const autoInserted = smartAttributes.map((attr) =>
        buildSelectedAttribute({
          themeId: attr.sourceThemeId,
          themeName: attr.sourceThemeName,
          objectId: attr.sourceObjectId,
          objectName: attr.sourceObjectName,
          attributeId: attr.id,
          attributeName: attr.rawName,
          attributeType: attr.type,
          insertionType: 'last',
          sortAttributeId: defaultSortAttributeId,
          navigationPath: [
            ...(navigationPath ?? []),
            ...attr.relativeNavigationPath,
          ],
        })
      );

      setSelectedAttributes((prev) => appendUniqueAttributes(prev, autoInserted));
      return;
    }

    if (mode === 'special' && isApplicable) {
      const objectAttributes = getObjectAttributes(themeId, objectId);
      const smartAttributes = objectAttributes.filter((attr) => !!attr.smartSel);

      if (smartAttributes.length === 0) {
        alert('Aucun attribut de sélection intelligente disponible pour cet objet.');
        return;
      }

      const autoInserted = smartAttributes.map((attr) =>
        buildSelectedAttribute({
          themeId: attr.sourceThemeId,
          themeName: attr.sourceThemeName,
          objectId: attr.sourceObjectId,
          objectName: attr.sourceObjectName,
          attributeId: attr.id,
          attributeName: attr.rawName,
          attributeType: attr.type,
          insertionType: attr.sourceObjectSupportsApplicable ? 'applicable' : 'normal',
          isApplicable: attr.sourceObjectSupportsApplicable,
          dateReference: attr.sourceObjectSupportsApplicable
            ? { type: 'today' }
            : undefined,
          navigationPath: [
            ...(navigationPath ?? []),
            ...attr.relativeNavigationPath,
          ],
        })
      );

      setSelectedAttributes((prev) => appendUniqueAttributes(prev, autoInserted));
      return;
    }

    const theme = dataStructure.find((t) => t.id === themeId);
    const obj = theme?.objects.find((o) => o.id === objectId);

    setPendingObjectInsertion({
      themeId,
      themeName,
      objectId,
      objectName,
      cardinality,
      mode,
      isApplicable,
      applicationDateRequirementMode: obj?.applicationDateConfig?.requirementMode ?? 'day',
      smartObjects: obj?.smartObjects,
      navigationPath,
      directMagicOnly: mode === 'aggregation',
    });
    setObjectInsertionDialogOpen(true);
  };

  const getInsertionAvailableAttributes = (pending: PendingObjectInsertion) => {
    if (pending.ownObjectOnly) {
      return getOwnObjectAttributes(pending.themeId, pending.objectId);
    }

    return pending.directMagicOnly
      ? getDirectMagicAttributes(pending.themeId, pending.objectId)
      : getObjectAttributes(pending.themeId, pending.objectId);
  };

  const getSelectedAttributeUniquenessKey = (attr: SelectedAttribute) => {
    const path = attr.navigationPath
      ?.map((p) => `${p.objectName}:${p.cardinalityName ?? ''}:${p.relationLabel ?? ''}:${p.sourceObjectName ?? ''}`)
      .join('>') ?? '';

    const dateReferencePart = attr.dateReference
      ? [
          attr.dateReference.type,
          attr.dateReference.customDate ?? '',
          attr.dateReference.attributeId ?? '',
        ].join(':')
      : '';

    return [
      attr.themeId,
      attr.objectId,
      attr.attributeId,
      path,
      attr.insertionType,
      attr.sortAttributeId ?? '',
      attr.sortDirection ?? '',
      attr.aggregationType ?? '',
      dateReferencePart,
      attr.insertionLotId ?? '',
      attr.insertionLotDateMode ?? '',
      attr.insertionLotDateColumnId ?? '',
      attr.lockedDateReferenceLabel ?? '',
    ].join('|');
  };

  const appendUniqueAttributes = (existing: SelectedAttribute[], candidates: SelectedAttribute[]) => {
    const existingKeys = new Set(existing.map(getSelectedAttributeUniquenessKey));
    const uniqueToAdd = candidates.filter((attr) => !existingKeys.has(getSelectedAttributeUniquenessKey(attr)));
    if (uniqueToAdd.length === 0) {
      return existing;
    }

    return [...existing, ...uniqueToAdd];
  };

  const contractPosteTargetTileNodes = contractPosteLotAttributeCatalog.tileNodes;

  const buildContractPosteTargetedAttribute = (attr: ContractPosteLotAttributeOption): SelectedAttribute => {
    const resolvedDateColumnId = collaboratorContractDateMode === 'reportColumn'
      ? (selectedCollaboratorContractDateColumnId || reportDateColumnOptions[0]?.id)
      : undefined;

    return buildSelectedAttribute({
      themeId: attr.sourceThemeId,
      themeName: attr.sourceThemeName,
      objectId: attr.sourceObjectId,
      objectName: attr.sourceObjectName,
      attributeId: attr.id,
      attributeName: attr.rawName,
      attributeType: attr.type,
      insertionType: 'applicable',
      isApplicable: true,
      dateReference: resolveContractPosteLotDateReference(collaboratorContractDateMode, resolvedDateColumnId),
      navigationPath: [...attr.lotBaseNavigationPath, ...attr.relativeNavigationPath],
      lockedDateReferenceLabel: 'date ciblée',
    });
  };

  const targetedContractPosteAttributeKeys = useMemo(
    () => new Set(
      selectedAttributes
        .filter((attr) => attr.lockedDateReferenceLabel === 'date ciblée')
        .map(getSelectedAttributeUniquenessKey)
    ),
    [selectedAttributes]
  );

  const isContractPosteTargetedAttributeSelected = (attr: ContractPosteLotAttributeOption) =>
    targetedContractPosteAttributeKeys.has(getSelectedAttributeUniquenessKey(buildContractPosteTargetedAttribute(attr)));

  const toggleContractPosteTargetedAttribute = (attr: ContractPosteLotAttributeOption, checked: boolean) => {
    const candidate = buildContractPosteTargetedAttribute(attr);
    const candidateKey = getSelectedAttributeUniquenessKey(candidate);

    setSelectedAttributes((prev) => {
      if (checked) {
        return appendUniqueAttributes(prev, [candidate]);
      }

      return prev.filter((existing) => getSelectedAttributeUniquenessKey(existing) !== candidateKey);
    });
  };

  const applyContractPosteTargetTileSelection = (
    mode: 'smart' | 'all' | 'none',
    attributes: ContractPosteLotAttributeOption[]
  ) => {
    const candidates = attributes.map(buildContractPosteTargetedAttribute);
    const candidateKeys = new Set(candidates.map(getSelectedAttributeUniquenessKey));

    setSelectedAttributes((prev) => {
      if (mode === 'none') {
        return prev.filter((existing) => !candidateKeys.has(getSelectedAttributeUniquenessKey(existing)));
      }

      const toAdd = mode === 'smart'
        ? candidates.filter((candidate, index) => !!attributes[index]?.magicSel)
        : candidates;

      return appendUniqueAttributes(prev, toAdd);
    });
  };

  useEffect(() => {
    setSelectedAttributes((prev) => {
      let changed = false;
      const resolvedDateColumnId = collaboratorContractDateMode === 'reportColumn'
        ? (selectedCollaboratorContractDateColumnId || reportDateColumnOptions[0]?.id)
        : undefined;
      const nextDateReference = resolveContractPosteLotDateReference(collaboratorContractDateMode, resolvedDateColumnId);

      const next = prev.map((attr) => {
        if (attr.lockedDateReferenceLabel !== 'date ciblée') {
          return attr;
        }

        const sameReference = JSON.stringify(attr.dateReference ?? null) === JSON.stringify(nextDateReference ?? null);
        if (sameReference) {
          return attr;
        }

        changed = true;
        return {
          ...attr,
          dateReference: nextDateReference,
        };
      });

      return changed ? next : prev;
    });
  }, [collaboratorContractDateMode, reportDateColumnOptions, selectedCollaboratorContractDateColumnId]);

  const getPendingLinkedAutoPeriodConditions = (
    pending: PendingObjectInsertion,
    objectAttributes: AvailableObjectAttribute[]
  ) => {
    if (!pending.linkedPeriodFilter || !pending.linkedDateFilterMode) return [] as FilterGroup['conditions'];

    const contextKey = getLinkedContextKey(
      pending.themeId,
      pending.objectId,
      pending.navigationPath ?? []
    );

    const resolveDateAttribute = (attributeId: string) =>
      objectAttributes.find(
        (attr) =>
          attr.sourceThemeId === pending.themeId
          && attr.sourceObjectId === pending.objectId
          && attr.relativeNavigationPath.length === 0
          && attr.type === 'date'
          && attr.id === attributeId
      );

    const firstDateAttribute = resolveDateAttribute(pending.linkedPeriodFilter.attrDate1);
    const secondDateAttribute = resolveDateAttribute(pending.linkedPeriodFilter.attrDate2);

    const conditions: FilterGroup['conditions'] = [];

    if (firstDateAttribute) {
      conditions.push({
        attributeId: `${AUTO_FILTER_COLUMN_PREFIX}${contextKey}::${firstDateAttribute.id}`,
        attributeName: `${getAutoFilterAttributeDisplayName(firstDateAttribute, pending.navigationPath ?? [])} [filtre auto]`,
        attributeType: 'date',
        operator: 'greaterOrEqual',
        value: '',
        valueType: 'attribute',
        referenceAttributeId: pending.linkedDateFilterMode === 'period' ? REPORT_PERIOD_START_VARIABLE_ID : REPORT_DATE_VARIABLE_ID,
        referenceAttributeName: pending.linkedDateFilterMode === 'period' ? REPORT_PERIOD_START_VARIABLE_LABEL : REPORT_DATE_VARIABLE_LABEL,
      });
    }

    if (secondDateAttribute) {
      conditions.push({
        attributeId: `${AUTO_FILTER_COLUMN_PREFIX}${contextKey}::${secondDateAttribute.id}`,
        attributeName: `${getAutoFilterAttributeDisplayName(secondDateAttribute, pending.navigationPath ?? [])} [filtre auto]`,
        attributeType: 'date',
        operator: 'lessOrEqual',
        value: '',
        valueType: 'attribute',
        referenceAttributeId: pending.linkedDateFilterMode === 'period' ? REPORT_PERIOD_END_VARIABLE_ID : REPORT_DATE_VARIABLE_ID,
        referenceAttributeName: pending.linkedDateFilterMode === 'period' ? REPORT_PERIOD_END_VARIABLE_LABEL : REPORT_DATE_VARIABLE_LABEL,
      });
    }

    return conditions;
  };

  const applyPendingLinkedAutoPeriodFilters = (
    pending: PendingObjectInsertion,
    objectAttributes: AvailableObjectAttribute[]
  ) => {
    const autoConditions = getPendingLinkedAutoPeriodConditions(pending, objectAttributes);
    if (autoConditions.length === 0) return;

    setGlobalFilterGroups((previous) => {
      const conditionKey = (condition: FilterGroup['conditions'][number]) => [
        condition.attributeId,
        condition.operator,
        condition.valueType ?? 'fixed',
        condition.referenceAttributeId ?? '',
      ].join('|');

      if (!previous || previous.length === 0) {
        return [{
          logicalOperator: 'ET',
          conditions: autoConditions,
        }];
      }

      const [firstGroup, ...otherGroups] = previous;
      const existingKeys = new Set(firstGroup.conditions.map(conditionKey));
      const conditionsToAdd = autoConditions.filter((condition) => !existingKeys.has(conditionKey(condition)));
      if (conditionsToAdd.length === 0) return previous;

      return [{
        ...firstGroup,
        conditions: [...firstGroup.conditions, ...conditionsToAdd],
      }, ...otherGroups];
    });
  };

  const handleObjectInsertionConfirm = (config: ObjectInsertionConfig) => {
    if (!pendingObjectInsertion) return;

    const getOperationColumnName = (
      insertionType: InsertionType,
      attributeName: string,
      sourceObjectName: string,
      aggregationType?: AggregationType
    ) => {
      const trimmedSourceObjectName = sourceObjectName.trim();
      if (insertionType === 'aggregation') {
        const aggregationLabel: Record<AggregationType, string> = {
          COUNT: 'Nombre',
          CONCAT: 'Concaténation',
          SUM: 'Somme',
          MIN: 'Minimum',
          MAX: 'Maximum',
          AVG: 'Moyenne',
        };
        const prefix = aggregationType ? aggregationLabel[aggregationType] : 'Agrégation';
        return `${prefix} de ${attributeName} — ${trimmedSourceObjectName}`;
      }

      if (insertionType === 'first') {
        return `Première instance de ${attributeName} — ${trimmedSourceObjectName}`;
      }

      if (insertionType === 'last') {
        return `Dernière instance de ${attributeName} — ${trimmedSourceObjectName}`;
      }

      return '';
    };

    if (editingAggregationAttributeId) {
      const objectAttributes = getInsertionAvailableAttributes(pendingObjectInsertion);
      const edited = selectedAttributes.find((attr) => attr.id === editingAggregationAttributeId);
      if (!edited) return;

      if (config.insertionType === 'aggregation') {
        const aggregatedAttr = objectAttributes.find((attr) => attr.id === config.aggregationAttributeId);
        if (!aggregatedAttr) return;

        const newAttr = buildSelectedAttribute({
          themeId: aggregatedAttr.sourceThemeId,
          themeName: aggregatedAttr.sourceThemeName,
          objectId: aggregatedAttr.sourceObjectId,
          objectName: aggregatedAttr.sourceObjectName,
          attributeId: aggregatedAttr.id,
          attributeName: aggregatedAttr.rawName,
          attributeType: aggregatedAttr.type,
          insertionType: 'aggregation',
          sortAttributeId: config.sortAttributeId,
          aggregationType: config.aggregationType,
          navigationPath: [
            ...(pendingObjectInsertion.navigationPath ?? []),
            ...aggregatedAttr.relativeNavigationPath,
          ],
          ownObjectOnly: pendingObjectInsertion.ownObjectOnly,
        });

        newAttr.columnName = getOperationColumnName(
          'aggregation',
          aggregatedAttr.rawName,
          pendingObjectInsertion.objectName,
          config.aggregationType
        );

        if (config.sortDirection) {
          newAttr.sortDirection = config.sortDirection;
        }

        setSelectedAttributes((prev) => {
          const remaining = editingOperationGroupKey
            ? prev.filter((attr) => getObjectInstanceKey(attr) !== editingOperationGroupKey)
            : prev.filter((attr) => attr.id !== editingAggregationAttributeId);
          return appendUniqueAttributes(remaining, [newAttr]);
        });
      } else {
        setSelectedAttributes((prev) =>
          prev.map((attr) => {
            const isTarget = editingOperationGroupKey
              ? getObjectInstanceKey(attr) === editingOperationGroupKey
              : attr.id === editingAggregationAttributeId;
            if (!isTarget) return attr;

            return {
              ...attr,
              insertionType: config.insertionType,
              sortAttributeId: config.sortAttributeId,
              sortDirection: undefined,
              aggregationType: undefined,
              columnName: getOperationColumnName(
                config.insertionType,
                attr.attributeName,
                pendingObjectInsertion.objectName,
                undefined
              ) || undefined,
            };
          })
        );
      }

      setEditingAggregationAttributeId(null);
      setEditingOperationGroupKey(null);
      setPendingObjectInsertion(null);
      setObjectInsertionDialogOpen(false);
      return;
    }

    const isMainObjectSelection = selectingMainObject && !!pendingMainObject;

    const objectAttributes = getInsertionAvailableAttributes(pendingObjectInsertion);

    if (config.insertionType === 'aggregation') {
      const aggregatedAttr = objectAttributes.find((attr) => attr.id === config.aggregationAttributeId);
      if (!aggregatedAttr) return;

      const newAttr = buildSelectedAttribute({
        themeId: aggregatedAttr.sourceThemeId,
        themeName: aggregatedAttr.sourceThemeName,
        objectId: aggregatedAttr.sourceObjectId,
        objectName: aggregatedAttr.sourceObjectName,
        attributeId: aggregatedAttr.id,
        attributeName: aggregatedAttr.rawName,
        attributeType: aggregatedAttr.type,
        insertionType: 'aggregation',
        sortAttributeId: config.sortAttributeId,
        aggregationType: config.aggregationType,
        navigationPath: [
          ...(pendingObjectInsertion.navigationPath ?? []),
          ...aggregatedAttr.relativeNavigationPath,
        ],
        ownObjectOnly: pendingObjectInsertion.ownObjectOnly,
      });

      newAttr.columnName = getOperationColumnName(
        'aggregation',
        aggregatedAttr.rawName,
        pendingObjectInsertion.objectName,
        config.aggregationType
      );

      if (config.sortDirection) {
        newAttr.sortDirection = config.sortDirection;
      }

      if (isMainObjectSelection && pendingMainObject) {
        const pendingTheme = dataStructure.find((theme) => theme.id === pendingMainObject.themeId);
        const pendingObject = pendingTheme?.objects.find((obj) => obj.id === pendingMainObject.objectId);
        setMainObject({
          themeId: pendingMainObject.themeId,
          themeName: pendingMainObject.themeName,
          objectId: pendingMainObject.objectId,
          objectName: pendingMainObject.objectName,
        });
        const nextTemporalContext = createDefaultTemporalContext();
        setReportTemporalContext(nextTemporalContext);
        setMainObjectConfig(config);
        setSelectingMainObject(false);
        setPendingMainObject(null);
        setSelectedAttributes([newAttr]);
        applyMainObjectDefaultDateFiltering(
          pendingMainObject.themeId,
          pendingMainObject.objectId,
          objectAttributes,
          pendingObject?.defaultDateFiltering,
          nextTemporalContext,
          {
            start: pendingObject?.applicationDateConfig?.startAttributeId,
            end: pendingObject?.applicationDateConfig?.endAttributeId,
          }
        );
      } else {
        setSelectedAttributes((prev) => appendUniqueAttributes(prev, [newAttr]));
      }

      applyPendingLinkedAutoPeriodFilters(pendingObjectInsertion, objectAttributes);

      setPendingObjectInsertion(null);
      return;
    }

    const selectedIds = config.selectedAttributeIds ?? [];
    const smartFilterTargetObjectKeys = new Set(
      (config.smartFilterGroups ?? [])
        .flatMap((group) => group.conditions)
        .map((condition) => objectAttributes.find((attribute) => attribute.id === condition.attributeId))
        .filter((attribute): attribute is NonNullable<typeof attribute> => !!attribute)
        .map((attribute) => `${attribute.sourceThemeId}::${attribute.sourceObjectId}`)
    );
    const newAttributes = objectAttributes
      .filter((attr) => selectedIds.includes(attr.id))
      .map((attr) =>
        {
          const attributeObjectKey = `${attr.sourceThemeId}::${attr.sourceObjectId}`;
          const shouldApplySmartFilters =
            !!config.smartFilterGroups
            && config.smartFilterGroups.length > 0
            && smartFilterTargetObjectKeys.has(attributeObjectKey);

          const shouldApplyDateReference =
            (attr.sourceObjectSupportsApplicable && attr.sourceObjectApplicationDateMandatory)
            || (
              (config.insertionType === 'applicable' || config.applyApplicableToday)
              && attr.sourceObjectSupportsApplicable
            );

          const nextInsertionType: InsertionType = shouldApplyDateReference
            ? 'applicable'
            : (config.insertionType === 'applicable' ? 'normal' : config.insertionType);

          const nextDateReference = shouldApplyDateReference
            ? (config.dateReference ?? (config.applyApplicableToday ? { type: 'today' } : undefined))
            : undefined;

          return buildSelectedAttribute({
            themeId: attr.sourceThemeId,
            themeName: attr.sourceThemeName,
            objectId: attr.sourceObjectId,
            objectName: attr.sourceObjectName,
            attributeId: attr.id,
            attributeName: attr.rawName,
            attributeType: attr.type,
            insertionType: nextInsertionType,
            sortAttributeId: config.sortAttributeId,
            filterGroups: shouldApplySmartFilters ? config.smartFilterGroups : undefined,
            isApplicable: shouldApplyDateReference,
            dateReference: nextDateReference,
            navigationPath: [
              ...(pendingObjectInsertion.navigationPath ?? []),
              ...attr.relativeNavigationPath,
            ],
            ownObjectOnly: pendingObjectInsertion.ownObjectOnly,
            lockedDateReferenceLabel: undefined,
          });
        }
      );

    newAttributes.forEach((attribute) => {
      if (attribute.insertionType === 'aggregation' || attribute.insertionType === 'first' || attribute.insertionType === 'last') {
        attribute.columnName = getOperationColumnName(
          attribute.insertionType,
          attribute.attributeName,
          pendingObjectInsertion.objectName,
          attribute.aggregationType
        ) || undefined;
      }
    });

    if (newAttributes.length > 0) {
      if (isMainObjectSelection && pendingMainObject) {
        const pendingTheme = dataStructure.find((theme) => theme.id === pendingMainObject.themeId);
        const pendingObject = pendingTheme?.objects.find((obj) => obj.id === pendingMainObject.objectId);
        setMainObject({
          themeId: pendingMainObject.themeId,
          themeName: pendingMainObject.themeName,
          objectId: pendingMainObject.objectId,
          objectName: pendingMainObject.objectName,
        });
        const nextTemporalContext = createDefaultTemporalContext();
        setReportTemporalContext(nextTemporalContext);
        setMainObjectConfig(config);
        setSelectingMainObject(false);
        setPendingMainObject(null);
        setSelectedAttributes((prev) => appendUniqueAttributes(prev, newAttributes));
        applyMainObjectDefaultDateFiltering(
          pendingMainObject.themeId,
          pendingMainObject.objectId,
          objectAttributes,
          pendingObject?.defaultDateFiltering,
          nextTemporalContext,
          {
            start: pendingObject?.applicationDateConfig?.startAttributeId,
            end: pendingObject?.applicationDateConfig?.endAttributeId,
          }
        );
      } else {
        setSelectedAttributes((prev) => appendUniqueAttributes(prev, newAttributes));
      }

      applyPendingLinkedAutoPeriodFilters(pendingObjectInsertion, objectAttributes);
    }

    setPendingObjectInsertion(null);
  };

  const getObjectInstanceKey = (attr: SelectedAttribute) => {
    const path = attr.navigationPath
      ?.map((p) => `${p.objectName}:${p.cardinalityName ?? ''}:${p.relationLabel ?? ''}:${p.sourceObjectName ?? ''}`)
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

  const handleRemoveAttribute = (id: string) => {
    setSelectedAttributes((prev) => prev.filter((attr) => attr.id !== id));
  };

  const handleGlobalFilterConfirm = (filterGroups?: FilterGroup[]) => {
    setGlobalFilterGroups(filterGroups);
  };

  const handleEditCompartment = (id: string) => {
    if (!showCompartmenting) return;
    const currentAttr = selectedAttributes.find((attr) => attr.id === id);
    if (!currentAttr || currentAttr.insertionType === 'applicable') return;
    setEditingAttributeId(id);
    setCompartmentDialogOpen(true);
  };

  const handleCompartmentConfirm = (compartmentConfig?: CompartmentConfig) => {
    if (!editingAttributeId) return;

    setSelectedAttributes((prev) =>
      prev.map((attr) =>
        attr.id === editingAttributeId ? { ...attr, compartmentConfig } : attr
      )
    );
    setEditingAttributeId(null);
  };

  const handleEditDateReference = (id: string) => {
    const currentAttr = selectedAttributes.find((attr) => attr.id === id);
    if (!currentAttr) return;

    if (currentAttr.insertionLotId) {
      const initialMode = currentAttr.insertionLotDateMode ?? 'reportEnd';
      const initialColumnId = currentAttr.insertionLotDateColumnId ?? reportDateColumnOptions[0]?.id ?? '';
      setEditingInsertionLotId(currentAttr.insertionLotId);
      setDraftLotDateMode(initialMode);
      setDraftLotDateColumnId(initialColumnId);
      setContractPosteLotDateDialogOpen(true);
      return;
    }

    if (currentAttr.applicationDateConfig?.requirementMode === 'period') return;
    setEditingAttributeId(id);
    setEditingObjectInstanceKey(getObjectInstanceKey(currentAttr));
    setDateReferenceDialogOpen(true);
  };

  const handleEditInsertionLot = (lotId: string) => {
    const lotAttributes = selectedAttributes.filter((attr) => attr.insertionLotId === lotId);
    if (lotAttributes.length === 0) return;

    setEditingInsertionLotId(lotId);
    setDraftLotAttributeKeys(
      Array.from(
        new Set(
          lotAttributes.map((attr) =>
            getContractPosteLotAttributeKey(attr.themeId, attr.objectId, attr.attributeId, attr.navigationPath ?? [])
          )
        )
      )
    );
    setContractPosteLotAttributesDialogOpen(true);
  };

  const handleContractPosteLotAttributesConfirm = () => {
    if (!editingInsertionLotId) return;

    setSelectedAttributes((prev) => {
      const currentLotAttributes = prev.filter((attr) => attr.insertionLotId === editingInsertionLotId);
      if (currentLotAttributes.length === 0) return prev;

      const firstLotIndex = prev.findIndex((attr) => attr.insertionLotId === editingInsertionLotId);
      if (firstLotIndex === -1) return prev;

      const lotPrototype = currentLotAttributes[0];
      const nextLotAttributes = buildContractPosteLotAttributes({
        collaboratorRelationLabel: lotPrototype.insertionLotLabel ?? '',
        insertionLotId: editingInsertionLotId,
        selectedAttributeKeys: draftLotAttributeKeys,
        dateMode: lotPrototype.insertionLotDateMode ?? 'reportEnd',
        dateColumnId: lotPrototype.insertionLotDateColumnId,
      });

      const beforeLot = prev.slice(0, firstLotIndex);
      const afterLot = prev.slice(firstLotIndex).filter((attr) => attr.insertionLotId !== editingInsertionLotId);

      return [...beforeLot, ...nextLotAttributes, ...afterLot];
    });

    setContractPosteLotAttributesDialogOpen(false);
    setEditingInsertionLotId(null);
    setDraftLotAttributeKeys([]);
  };

  const handleContractPosteLotDateConfirm = () => {
    if (!editingInsertionLotId) return;

    const resolvedColumnId = draftLotDateMode === 'reportColumn'
      ? (draftLotDateColumnId || reportDateColumnOptions[0]?.id)
      : undefined;
    const nextDateReference = resolveContractPosteLotDateReference(draftLotDateMode, resolvedColumnId);
    const nextDateLabel = getContractPosteLotDateLabel(draftLotDateMode, resolvedColumnId);

    setSelectedAttributes((prev) =>
      prev.map((attr) =>
        attr.insertionLotId === editingInsertionLotId
          ? {
              ...attr,
              dateReference: nextDateReference,
              insertionLotDateMode: draftLotDateMode,
              insertionLotDateColumnId: resolvedColumnId,
              insertionLotDateLabel: nextDateLabel,
            }
          : attr
      )
    );

    setContractPosteLotDateDialogOpen(false);
    setEditingInsertionLotId(null);
  };

  const handleDateReferenceConfirm = (dateReference: DateReference) => {
    if (!editingAttributeId) return;

    const key = editingObjectInstanceKey;

    setSelectedAttributes((prev) =>
      prev.map((attr) =>
        key
          ? (getObjectInstanceKey(attr) === key ? { ...attr, dateReference } : attr)
          : (attr.id === editingAttributeId ? { ...attr, dateReference } : attr)
      )
    );
    setEditingAttributeId(null);
    setEditingObjectInstanceKey(null);
  };

  const handleEditConditionalColumn = (id: string) => {
    if (!showConditionalColumns) return;
    setEditingAttributeId(id);
    setConditionalColumnDialogOpen(true);
  };

  const handleConditionalColumnConfirm = (config: ConditionalColumnConfig) => {
    if (editingAttributeId) {
      // Édition d'une colonne existante
      setSelectedAttributes((prev) =>
        prev.map((attr) =>
          attr.id === editingAttributeId ? { ...attr, conditionalConfig: config, columnName: config.name } : attr
        )
      );
      setEditingAttributeId(null);
    } else {
      // Création d'une nouvelle colonne conditionnelle
      const newAttr: SelectedAttribute = {
        id: `${Date.now()}-${Math.random()}`,
        attributeId: 'conditional',
        attributeName: config.name,
        attributeType: 'boolean',
        objectId: 'conditional',
        objectName: 'Colonne calculée',
        themeId: 'conditional',
        themeName: 'Colonnes calculées',
        insertionType: 'conditional',
        conditionalConfig: config,
        columnName: config.name,
      };
      setSelectedAttributes((prev) => [...prev, newAttr]);
    }
  };

  const handleCreateConditionalColumn = () => {
    if (!showConditionalColumns) return;
    setEditingAttributeId(null);
    setConditionalColumnDialogOpen(true);
  };

  const handleEditCalculatedColumn = (id: string) => {
    if (!showCalculatedColumns) return;
    setEditingAttributeId(id);
    setCalculatedColumnDialogOpen(true);
  };

  const handleEditAggregation = (id: string) => {
    const attr = selectedAttributes.find((a) => a.id === id);
    if (!attr || !['first', 'last', 'aggregation'].includes(attr.insertionType)) return;

    const targetGroupKey = getObjectInstanceKey(attr);

    setEditingAggregationAttributeId(id);
    setEditingOperationGroupKey(targetGroupKey);
    setPendingObjectInsertion({
      themeId: attr.themeId,
      themeName: attr.themeName,
      objectId: attr.objectId,
      objectName: attr.objectName,
      cardinality: attr.navigationPath?.[attr.navigationPath.length - 1]?.cardinalityName || '1',
      mode: 'operation',
      isApplicable: attr.isApplicable,
      applicationDateRequirementMode: attr.applicationDateConfig?.requirementMode ?? 'day',
      navigationPath: attr.navigationPath,
      ownObjectOnly: attr.ownObjectOnly ?? !!(attr.navigationPath && attr.navigationPath.length > 0),
    });
    setObjectInsertionDialogOpen(true);
  };

  const handleCalculatedColumnConfirm = (config: CalculatedColumnConfig) => {
    if (editingAttributeId) {
      // Édition d'une colonne existante
      setSelectedAttributes((prev) =>
        prev.map((attr) =>
          attr.id === editingAttributeId ? { ...attr, calculatedConfig: config, columnName: config.name } : attr
        )
      );
      setEditingAttributeId(null);
    } else {
      // Création d'une nouvelle colonne calculée
      const newAttr: SelectedAttribute = {
        id: `${Date.now()}-${Math.random()}`,
        attributeId: 'calculated',
        attributeName: config.name,
        attributeType: 'number',
        objectId: 'calculated',
        objectName: 'Colonne calculée',
        themeId: 'calculated',
        themeName: 'Colonnes calculées',
        insertionType: 'calculated',
        calculatedConfig: config,
        columnName: config.name,
      };
      setSelectedAttributes((prev) => [...prev, newAttr]);
    }
  };

  const handleCreateCalculatedColumn = () => {
    if (!showCalculatedColumns) return;
    setEditingAttributeId(null);
    setCalculatedColumnDialogOpen(true);
  };

  const getAvailableColumnsForConditional = () => {
    return selectedAttributes
      .filter(attr => attr.insertionType !== 'conditional') // Exclure les autres colonnes conditionnelles
      .map(attr => ({
        id: attr.id,
        name: attr.columnName || `${attr.attributeName} (${attr.objectName})`,
        type: attr.attributeType,
      }));
  };

  const handleAddContractPosteLot = (collaboratorRelationLabel: string) => {
    if (!mainObject || !mainObjectLinkedToCollaborateur) return;
    const insertionLotId = `contract-poste-lot-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const defaultMode: CollaboratorContractDateMode = 'reportEnd';
    const defaultSelectedAttributeKeys = contractPosteLotAttributeCatalog.flatOptions
      .filter((attr) => !!attr.magicSel)
      .map((attr) => getContractPosteLotAttributeKey(attr.sourceThemeId, attr.sourceObjectId, attr.id, attr.lotBaseNavigationPath));

    const lotAttributes = buildContractPosteLotAttributes({
      collaboratorRelationLabel,
      insertionLotId,
      selectedAttributeKeys: defaultSelectedAttributeKeys,
      dateMode: defaultMode,
    });

    if (lotAttributes.length === 0) return;

    setSelectedAttributes((prev) => appendUniqueAttributes(prev, lotAttributes));
  };

  const getAvailableColumnsForCalculated = () => {
    return selectedAttributes
      .filter(attr => attr.insertionType !== 'calculated') // Exclure les autres colonnes calculées
      .map(attr => ({
        id: attr.id,
        name: attr.columnName || `${attr.attributeName} (${attr.objectName})`,
        type: attr.attributeType,
      }));
  };

  const handleReorder = (draggedId: string, targetId: string) => {
    setSelectedAttributes((prev) => {
      const draggedIndex = prev.findIndex((attr) => attr.id === draggedId);
      const targetIndex = prev.findIndex((attr) => attr.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return prev;
      }

      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);

      // Keep grouped columns priority aligned with the current column order.
      const updatedOrder = new Map(updated.map((attr, index) => [attr.id, index] as const));
      setGroupedColumnIds((prevGrouped) =>
        [...prevGrouped]
          .filter((id) => updatedOrder.has(id))
          .sort((a, b) => (updatedOrder.get(a) ?? 0) - (updatedOrder.get(b) ?? 0))
      );

      return updated;
    });
  };

  const handleEditColumnName = (id: string, newName: string) => {
    setSelectedAttributes((prev) =>
      prev.map((attr) =>
        attr.id === id ? { ...attr, columnName: newName } : attr
      )
    );
  };

  const handleChangeReportType = () => {
    const defaultTemporalContext = createDefaultTemporalContext();
    const defaultChosenDate = defaultTemporalContext.periodEndDate ?? defaultTemporalContext.reportDate;
    const defaultChosenPeriodStart = defaultTemporalContext.periodStartDate ?? addMonthsIsoDate(defaultTemporalContext.reportDate, -12);
    const defaultChosenPeriodEnd = defaultTemporalContext.periodEndDate ?? defaultTemporalContext.reportDate;

    setSelectedAttributes([]);
    setGlobalFilterGroups(undefined);
    setGlobalFilterDialogOpen(false);
    setGroupedColumnIds([]);
    setPendingGroupColumnId('');
    setDisplayAsColumnsAttributeId('');
    setSelectingMainObject(true);
    setMainObject(null);
    setMainObjectConfig(null);
    setPendingMainObject(null);
    setPendingObjectInsertion(null);
    setObjectInsertionDialogOpen(false);
    setSortColumnIds([]);
    setPendingSortColumnId('');
    setReportPreviewColumns([]);
    setReportPreviewRows([]);
    setReportTemporalContext(defaultTemporalContext);
    setReportChosenDate(defaultChosenDate);
    setReportChosenPeriodStart(defaultChosenPeriodStart);
    setReportChosenPeriodEnd(defaultChosenPeriodEnd);
    setIncludeDepartedCollaborators(false);
    setIncludePresentCollaborators(true);
    setIncludeFutureNewCollaborators(false);
    setIncludeFutureReturnCollaborators(false);
    setCollaboratorContextExpanded(false);
    setSelectedCollaboratorTarget('');
    setSelectedCollaboratorName('');
    setCollaboratorContractDateMode('reportEnd');
    setSelectedCollaboratorContractDateColumnId('');
    setSelectedManagerCollaboratorName('');
    setIncludeManagerDescendants(false);
    setSelectedContractTypeFilters([]);
    setSelectedQualificationFilters([]);
    setSelectedDepartmentFilters([]);
    setSelectedEstablishmentFilters([]);
    setCollaboratorStatusFilterExpanded(false);
    setPendingInitialAvailableGroupsCollapse(false);
  };

  const handleResetSelections = () => {
    if (!window.confirm('Confirmer la réinitialisation de tous les attributs sélectionnés ?')) {
      return;
    }

    setSelectedAttributes([]);
    setGlobalFilterGroups(undefined);
    setGlobalFilterDialogOpen(false);
    setGroupedColumnIds([]);
    setPendingGroupColumnId('');
    setDisplayAsColumnsAttributeId('');
    setSortColumnIds([]);
    setPendingSortColumnId('');
    setSelectedCollaboratorName('');
    setCollaboratorContractDateMode('reportEnd');
    setSelectedCollaboratorContractDateColumnId('');
    setSelectedManagerCollaboratorName('');
    setIncludeManagerDescendants(false);
    setSelectedContractTypeFilters([]);
    setSelectedQualificationFilters([]);
    setSelectedDepartmentFilters([]);
    setSelectedEstablishmentFilters([]);
    setReportPreviewColumns([]);
    setReportPreviewRows([]);
  };

  useEffect(() => {
    const selectedIds = new Set(selectedAttributes.map((attr) => attr.id));
    const selectedOrder = new Map(selectedAttributes.map((attr, index) => [attr.id, index] as const));
    const groupedIdSet = new Set(groupedColumnIds);
    setGroupedColumnIds((prev) =>
      [...prev]
        .filter((id) => selectedIds.has(id))
        .sort((a, b) => (selectedOrder.get(a) ?? 0) - (selectedOrder.get(b) ?? 0))
    );
    setDisplayAsColumnsAttributeId((prev) => (prev && !selectedIds.has(prev) ? '' : prev));
    setPendingGroupColumnId((prev) => (prev && !selectedIds.has(prev) ? '' : prev));
    setSortColumnIds((prev) => prev.filter((id) => selectedIds.has(id) && !groupedIdSet.has(id)));
    setPendingSortColumnId((prev) => (prev && !selectedIds.has(prev) ? '' : prev));
  }, [selectedAttributes]);

  useEffect(() => {
    if (!showDisplayAsColumns) {
      setDisplayAsColumnsAttributeId('');
    }
  }, [showDisplayAsColumns]);

  const openPrototypeConfig = () => {
    setDraftShowCompartmenting(showCompartmenting);
    setDraftShowConditionalColumns(showConditionalColumns);
    setDraftShowCalculatedColumns(showCalculatedColumns);
    setDraftShowColumnRename(showColumnRename);
    setDraftShowDisplayAsColumns(showDisplayAsColumns);
    setDraftShowLinkedObjectCardinalities(showLinkedObjectCardinalities);
    setDraftShowOtherCardinalitiesButton(showOtherCardinalitiesButton);
    setDraftShowSelectAllButton(showSelectAllButton);
    setPrototypeConfigOpen(true);
  };

  const applyPrototypeConfig = () => {
    setShowCompartmenting(draftShowCompartmenting);
    setShowConditionalColumns(draftShowConditionalColumns);
    setShowCalculatedColumns(draftShowCalculatedColumns);
    setShowColumnRename(draftShowColumnRename);
    setShowDisplayAsColumns(draftShowDisplayAsColumns);
    setShowLinkedObjectCardinalities(draftShowLinkedObjectCardinalities);
    setShowOtherCardinalitiesButton(draftShowOtherCardinalitiesButton);
    setShowSelectAllButton(draftShowSelectAllButton);
    setPrototypeConfigOpen(false);
  };

  const handleBackToConfiguration = () => {
    setAvailableAttributeSearchTerm('');
    setReportResultOpen(false);
  };

  const toggleAvailableGroupCollapsed = (groupKey: string) => {
    setCollapsedAvailableGroupKeys((prev) =>
      prev.includes(groupKey)
        ? prev.filter((key) => key !== groupKey)
        : [...prev, groupKey]
    );
  };

  const toggleApplicableTileCollapsed = (tileKey: string) => {
    setCollapsedApplicableTileKeys((prev) =>
      prev.includes(tileKey)
        ? prev.filter((key) => key !== tileKey)
        : [...prev, tileKey]
    );
  };

  const collapseAllAvailableObjects = () => {
    setCollapsedAvailableGroupKeys(Array.from(renderCandidateMainObjectStage2GroupKeys));
    setCollapsedApplicableTileKeys([...applicableTileKeys]);
  };

  const expandAllAvailableObjects = () => {
    setCollapsedAvailableGroupKeys([]);
    setCollapsedApplicableTileKeys([]);
  };

  const getDateAttributeName = (attributeId: string): string => {
    const attr = selectedAttributes.find((a) => a.id === attributeId);
    if (attr) {
      const navigationObjects = attr.navigationPath
        ?.map((item) => item.objectName?.trim())
        .filter((value): value is string => !!value) ?? [];

      const objectContext = navigationObjects.length > 0
        ? navigationObjects.join(' > ')
        : attr.objectName;

      return `${attr.attributeName} (${objectContext})`;
    }
    return '';
  };

  const getAvailableDateAttributes = () => {
    return selectedAttributes.filter((attr) => attr.attributeType === 'date');
  };

  const getSelectedAttributeObjectGroupTitle = (attr: SelectedAttribute) => {
    if (attr.insertionType === 'conditional' || attr.insertionType === 'calculated') {
      return '';
    }

    return getObjectGroupTitleFromNavigationPath(attr.objectName, attr.navigationPath ?? []);

  };

  const getSelectedAttributeDisplayName = (attr: SelectedAttribute) => {
    const baseName = attr.columnName || attr.attributeName;
    const groupTitle = getSelectedAttributeObjectGroupTitle(attr);

    if (!groupTitle) return baseName;
    return `${baseName} – ${groupTitle}`;
  };

  const normalizeOptionSortKey = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();

  const getSelectedAttributeOptionLabel = (attr: SelectedAttribute) => attr.columnName || attr.attributeName;

  const buildSelectedAttributeOptionGroups = (attributes: SelectedAttribute[]) => {
    const groups = new Map<string, SelectedAttribute[]>();

    for (const attr of attributes) {
      const groupLabel = getSelectedAttributeObjectGroupTitle(attr) || attr.objectName;
      const existing = groups.get(groupLabel);
      if (existing) {
        existing.push(attr);
      } else {
        groups.set(groupLabel, [attr]);
      }
    }

    return Array.from(groups.entries())
      .map(([label, items]) => ({
        label,
        items: [...items].sort((a, b) => {
          const byAttribute = normalizeOptionSortKey(getSelectedAttributeOptionLabel(a)).localeCompare(
            normalizeOptionSortKey(getSelectedAttributeOptionLabel(b)),
            'fr'
          );
          if (byAttribute !== 0) return byAttribute;
          return normalizeOptionSortKey(getSelectedAttributeDisplayName(a)).localeCompare(
            normalizeOptionSortKey(getSelectedAttributeDisplayName(b)),
            'fr'
          );
        }),
      }))
      .sort((a, b) => normalizeOptionSortKey(a.label).localeCompare(normalizeOptionSortKey(b.label), 'fr'));
  };

  const reportDateColumnOptionGroups = useMemo(
    () => buildSelectedAttributeOptionGroups(reportDateColumnAttributes),
    [reportDateColumnAttributes]
  );

  const compareSelectedAttributesByAttributeThenContext = (a: SelectedAttribute, b: SelectedAttribute) => {
    const normalizeSortKey = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase();

    const aAttributeName = a.attributeName;
    const bAttributeName = b.attributeName;
    const byAttributeName = normalizeSortKey(aAttributeName).localeCompare(normalizeSortKey(bAttributeName), 'fr');
    if (byAttributeName !== 0) return byAttributeName;

    const byObjectName = normalizeSortKey(a.objectName ?? '').localeCompare(normalizeSortKey(b.objectName ?? ''), 'fr');
    if (byObjectName !== 0) return byObjectName;

    const aFirstStep = a.navigationPath?.[0];
    const bFirstStep = b.navigationPath?.[0];
    const aRelationName = aFirstStep?.relationLabel?.trim() || aFirstStep?.objectName?.trim() || '';
    const bRelationName = bFirstStep?.relationLabel?.trim() || bFirstStep?.objectName?.trim() || '';
    const byRelationName = normalizeSortKey(aRelationName).localeCompare(normalizeSortKey(bRelationName), 'fr');
    if (byRelationName !== 0) return byRelationName;

    return normalizeSortKey(getSelectedAttributeDisplayName(a)).localeCompare(normalizeSortKey(getSelectedAttributeDisplayName(b)), 'fr');
  };

  const getFilterObjectGroupTitle = (objectName: string, navigationPath?: NavigationPath) => {
    return getObjectGroupTitleFromNavigationPath(objectName, navigationPath ?? []);
  };

  const getGlobalFilterTechnicalObjectAttributes = () => {
    const technicalAttributes: Array<{ id: string; name: string; type: AttributeType; enumValues?: string[] }> = [];
    const seenContexts = new Set<string>();

    for (const insertedAttribute of selectedAttributes) {
      if (!['first', 'last', 'aggregation'].includes(insertedAttribute.insertionType)) continue;
      if (!insertedAttribute.navigationPath || insertedAttribute.navigationPath.length === 0) continue;

      const navigationPathSignature = insertedAttribute.navigationPath
        .map((step) => `${step.objectName}:${step.cardinalityName ?? ''}:${step.relationLabel ?? ''}:${step.sourceObjectName ?? ''}`)
        .join('>');
      const contextKey = getLinkedContextKey(
        insertedAttribute.themeId,
        insertedAttribute.objectId,
        insertedAttribute.navigationPath ?? []
      );
      if (seenContexts.has(contextKey)) continue;
      seenContexts.add(contextKey);

      const sourceTheme = dataStructure.find((theme) => theme.id === insertedAttribute.themeId);
      const sourceObject = sourceTheme?.objects.find((object) => object.id === insertedAttribute.objectId);
      if (!sourceTheme || !sourceObject) continue;

      const objectGroupTitle = getFilterObjectGroupTitle(
        insertedAttribute.objectName,
        insertedAttribute.navigationPath,
      );

      for (const sourceAttribute of sourceObject.attributes) {
        technicalAttributes.push({
          id: `${AUTO_FILTER_COLUMN_PREFIX}${contextKey}::${sourceAttribute.id}`,
          name: `${sourceAttribute.name} – ${objectGroupTitle}`,
          type: sourceAttribute.type,
          enumValues: sourceAttribute.enumValues,
        });
      }
    }

    return technicalAttributes;
  };

  const getGlobalFilterObjectAttributes = () => {
    const selectedObjectAttributes = selectedAttributes.map((attr) => {
      const sourceTheme = dataStructure.find((theme) => theme.id === attr.themeId);
      const sourceObject = sourceTheme?.objects.find((object) => object.id === attr.objectId);
      const sourceAttribute = sourceObject?.attributes.find((attribute) => attribute.id === attr.attributeId);

      return {
        id: attr.id,
        name: getSelectedAttributeDisplayName(attr),
        type: attr.attributeType,
        enumValues: sourceAttribute?.enumValues,
      };
    });

    return [
      ...selectedObjectAttributes,
      ...getGlobalFilterTechnicalObjectAttributes(),
    ];
  };

  const getGlobalSelectedAttributesForFilter = () => {
    const selectedFilterAttributes = [...selectedAttributes]
      .sort(compareSelectedAttributesByAttributeThenContext)
      .map((attr) => ({
      id: attr.id,
      name: attr.attributeName,
      columnName: getSelectedAttributeDisplayName(attr),
      type: attr.attributeType,
      }));
    const technicalFilterAttributes = getGlobalFilterTechnicalObjectAttributes()
      .map((attr) => ({
        id: attr.id,
        name: attr.name,
        columnName: attr.name,
        type: attr.type,
      }));

    const reportDateVariables = (() => {
      if (!mainObjectDefinition || !mainObject) return [] as Array<{ id: string; name: string; columnName: string; type: 'date' }>;

      const reportDateGroupLabel = 'Date du rapport';

      if (mainObjectDefinition.defaultDateFiltering === 'chooseOne') {
        return [{
          id: REPORT_DATE_VARIABLE_ID,
          name: `${REPORT_DATE_VARIABLE_LABEL} – ${reportDateGroupLabel}`,
          columnName: REPORT_DATE_VARIABLE_LABEL,
          type: 'date' as const,
        }];
      }

      if (mainObjectDefinition.defaultDateFiltering === 'choosePeriod') {
        return [
          {
            id: REPORT_PERIOD_START_VARIABLE_ID,
            name: `${REPORT_PERIOD_START_VARIABLE_LABEL} – ${reportDateGroupLabel}`,
            columnName: REPORT_PERIOD_START_VARIABLE_LABEL,
            type: 'date' as const,
          },
          {
            id: REPORT_PERIOD_END_VARIABLE_ID,
            name: `${REPORT_PERIOD_END_VARIABLE_LABEL} – ${reportDateGroupLabel}`,
            columnName: REPORT_PERIOD_END_VARIABLE_LABEL,
            type: 'date' as const,
          },
        ];
      }

      if (typeof mainObjectDefinition.defaultDateFiltering === 'object') {
        return [
          {
            id: REPORT_PERIOD_START_VARIABLE_ID,
            name: `${REPORT_PERIOD_START_VARIABLE_LABEL} – ${reportDateGroupLabel}`,
            columnName: REPORT_PERIOD_START_VARIABLE_LABEL,
            type: 'date' as const,
          },
          {
            id: REPORT_PERIOD_END_VARIABLE_ID,
            name: `${REPORT_PERIOD_END_VARIABLE_LABEL} – ${reportDateGroupLabel}`,
            columnName: REPORT_PERIOD_END_VARIABLE_LABEL,
            type: 'date' as const,
          },
        ];
      }

      return [] as Array<{ id: string; name: string; columnName: string; type: 'date' }>;
    })();

    return [
      ...selectedFilterAttributes,
      ...technicalFilterAttributes,
      ...reportDateVariables,
    ];
  };

  const getGlobalCompartmentFilterAttributes = () => {
    if (!showCompartmenting) return [] as Array<{ id: string; name: string; values: string[]; sourceAttributeName: string }>;

    return selectedAttributes
      .filter((attr) => !!attr.compartmentConfig && attr.compartmentConfig.compartments.length > 0)
      .map((attr) => ({
        id: attr.id,
        name: `Compartiment ${attr.columnName || attr.attributeName}`,
        values: attr.compartmentConfig?.compartments.map((comp) => comp.name) ?? [],
        sourceAttributeName: attr.columnName || attr.attributeName,
      }));
  };

  const globalFilterInvolvedAttributeIds = Array.from(
    new Set(
      (globalFilterGroups ?? []).flatMap((group) =>
        group.conditions.flatMap((condition) =>
          [condition.attributeId, condition.referenceAttributeId].filter((value): value is string => !!value)
        )
      )
    )
  );

  const globalSortInvolvedAttributeIds = Array.from(
    new Set(
      [
        ...sortColumnIds,
        ...(displayAsColumnsAttributeId ? [displayAsColumnsAttributeId] : []),
        ...selectedAttributes
          .flatMap((attr) => [attr.sortAttributeId].filter((value): value is string => !!value)),
      ]
    )
  );

  const getGlobalFilterOperatorLabel = (operator: FilterGroup['conditions'][number]['operator']) => {
    const allOperators: Array<{ value: FilterGroup['conditions'][number]['operator']; label: string }> = [
      { value: 'equals', label: 'Égal à' },
      { value: 'notEquals', label: 'Différent de' },
      { value: 'greaterThan', label: 'Supérieur à' },
      { value: 'lessThan', label: 'Inférieur à' },
      { value: 'greaterOrEqual', label: 'Supérieur ou égal à' },
      { value: 'lessOrEqual', label: 'Inférieur ou égal à' },
      { value: 'contains', label: 'Contient' },
      { value: 'startsWith', label: 'Commence par' },
      { value: 'endsWith', label: 'Termine par' },
      { value: 'isEmpty', label: 'Vide' },
      { value: 'isNotEmpty', label: 'Renseignée' },
      { value: 'in', label: 'in' },
    ];

    return allOperators.find((entry) => entry.value === operator)?.label ?? operator;
  };

  const getGlobalFilterConditionLabel = (condition: FilterGroup['conditions'][number]) => {
    const op = getGlobalFilterOperatorLabel(condition.operator);
    const globalFilterAttributes = getGlobalSelectedAttributesForFilter();
    const getFilterAttributeLabel = (attributeId?: string, fallbackLabel?: string) => {
      if (!attributeId) return fallbackLabel ?? '';
      const matchingAttribute = globalFilterAttributes.find((attr) => attr.id === attributeId);
      return matchingAttribute?.columnName || matchingAttribute?.name || fallbackLabel || '';
    };

    const leftAttributeLabel = getFilterAttributeLabel(condition.attributeId, condition.attributeName);
    const formatFilterValue = (value: string | number | boolean) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return isoToFrDate(value) || value;
      }
      return String(value);
    };

    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return `${leftAttributeLabel} ${op}`;
    }

    if (condition.valueType === 'attribute' && (condition.referenceAttributeId || condition.referenceAttributeName)) {
      const rightAttributeLabel = getFilterAttributeLabel(condition.referenceAttributeId, condition.referenceAttributeName);
      return `${leftAttributeLabel} ${op} ${rightAttributeLabel}`;
    }

    const renderedValue = Array.isArray(condition.value)
      ? `[${condition.value.map((value) => formatFilterValue(value)).join(', ')}]`
      : `"${formatFilterValue(condition.value)}"`;

    return `${leftAttributeLabel} ${op} ${renderedValue}`;
  };

  const getGlobalFilterGroupLines = () => {
    if (!globalFilterGroups || globalFilterGroups.length === 0) return [] as string[];
    return globalFilterGroups.map((group) =>
      group.conditions.length > 1
        ? `(${group.conditions.map(getGlobalFilterConditionLabel).join(` ${group.logicalOperator} `)})`
        : group.conditions.map(getGlobalFilterConditionLabel).join(` ${group.logicalOperator} `)
    );
  };

  const getCollaboratorStatusFilterLines = () => {
    const formattedDate = isoToFrDate(collaboratorStatusReferenceDate) || collaboratorStatusReferenceDate;
    const lines: string[] = [];

    if (includeDepartedCollaborators) {
      lines.push(
        `Partis: collaborateurs ayant un poste avec Date fin <= ${formattedDate} et n'ayant aucun poste avec Date début >= ${formattedDate}.`
      );
    }

    if (includePresentCollaborators) {
      lines.push(
        `Présents: collaborateurs ayant un poste avec Date début <= ${formattedDate} et (Date fin >= ${formattedDate} ou Date fin vide).`
      );
    }

    if (includeFutureNewCollaborators) {
      lines.push(
        `Nouveaux: collaborateurs ayant un poste futur (Date début > ${formattedDate}) sans poste passé (Date fin < ${formattedDate}).`
      );
    }

    if (includeFutureReturnCollaborators) {
      lines.push(
        `Retours: collaborateurs ayant un poste futur (Date début > ${formattedDate}) et aussi un poste passé (Date fin < ${formattedDate}), sans poste présent à la date ${formattedDate}.`
      );
    }

    return lines;
  };

  const getCollaboratorOrgFilterLine = () => {
    const formatOrgFilterList = (values: string[], maxVisibleItems = 5) => {
      if (values.length <= maxVisibleItems) {
        return values.join(', ');
      }

      return [
        ...values.slice(0, 2),
        '...',
        ...values.slice(values.length - 2),
      ].join(', ');
    };

    const clauses: string[] = [];

    const dateModeLabel =
      collaboratorContractDateMode === 'today'
        ? 'date du jour'
        : collaboratorContractDateMode === 'reportStart'
        ? (isReportInDayMode ? 'date du rapport' : 'Date de début du rapport')
        : collaboratorContractDateMode === 'reportEnd'
        ? (isReportInDayMode ? 'date du rapport' : 'Date de fin du rapport')
        : (() => {
            const selectedDateColumn = reportDateColumnOptions.find((option) => option.id === selectedCollaboratorContractDateColumnId);
            return selectedDateColumn ? `colonne du rapport (${selectedDateColumn.label})` : 'colonne du rapport';
          })();
    clauses.push(`Contrat et poste ciblé: ${dateModeLabel}`);

    if (selectedCollaboratorTarget) {
      clauses.push(`Collaborateur concerné: ${selectedCollaboratorTarget}`);
    }

    if (selectedCollaboratorName) {
      clauses.push(`Collaborateur: ${selectedCollaboratorName}`);
    }

    if (selectedManagerCollaboratorName) {
      clauses.push(
        `Manager du collaborateur: ${selectedManagerCollaboratorName}${includeManagerDescendants ? ' (avec descendance managériale)' : ''}`
      );
    }

    if (selectedContractTypeFilters.length > 0) {
      clauses.push(`Type du contrat dans (${formatOrgFilterList(selectedContractTypeFilters)})`);
    }

    if (selectedQualificationFilters.length > 0) {
      clauses.push(`Qualification du poste dans (${formatOrgFilterList(selectedQualificationFilters)})`);
    }

    if (selectedDepartmentFilters.length > 0) {
      clauses.push(`Département du poste dans (${formatOrgFilterList(selectedDepartmentFilters)})`);
    }

    if (selectedEstablishmentFilters.length > 0) {
      clauses.push(`Etablissement du poste dans (${selectedEstablishmentFilters.join(', ')})`);
    }

    if (clauses.length === 0) return null;
    return clauses.join(' et ');
  };

  const getDepartmentBranchNames = (node: DepartmentNode): string[] => {
    return [node.name, ...node.children.flatMap(getDepartmentBranchNames)];
  };

  const getQualificationBranchNames = (node: QualificationNode): string[] => {
    return [node.name, ...node.children.flatMap(getQualificationBranchNames)];
  };

  const toggleDepartmentBranch = (node: DepartmentNode, isChecked: boolean) => {
    const branchNames = getDepartmentBranchNames(node);
    setSelectedCollaboratorName('');
    setSelectedDepartmentFilters((prev) => {
      const next = new Set(prev);
      for (const name of branchNames) {
        if (isChecked) {
          next.add(name);
        } else {
          next.delete(name);
        }
      }
      return Array.from(next).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    });
  };

  const toggleQualificationBranch = (node: QualificationNode, isChecked: boolean) => {
    const branchNames = getQualificationBranchNames(node);
    setSelectedCollaboratorName('');
    setSelectedQualificationFilters((prev) => {
      const next = new Set(prev);
      for (const name of branchNames) {
        if (isChecked) {
          next.add(name);
        } else {
          next.delete(name);
        }
      }
      return Array.from(next).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    });
  };

  const handleCollaboratorNameChange = (value: string) => {
    setSelectedCollaboratorName(value);

    if (!value) {
      return;
    }

    // Keep collaborator target, reset all other collaborator-context filters.
    setCollaboratorContractDateMode('reportEnd');
    setSelectedCollaboratorContractDateColumnId('');
    setSelectedManagerCollaboratorName('');
    setIncludeManagerDescendants(false);
    setSelectedContractTypeFilters([]);
    setSelectedQualificationFilters([]);
    setSelectedDepartmentFilters([]);
    setSelectedEstablishmentFilters([]);
  };

  const handleManagerCollaboratorChange = (value: string) => {
    setSelectedManagerCollaboratorName(value);
    setIncludeManagerDescendants(false);
    setSelectedCollaboratorName('');
  };

  const getSortableSelectedAttributes = () => {
    return selectedAttributes.filter((attr) => attr.insertionType !== 'conditional' && attr.insertionType !== 'calculated');
  };

  const getGroupableSelectedAttributes = () => {
    return selectedAttributes.filter((attr) => attr.insertionType !== 'conditional' && attr.insertionType !== 'calculated');
  };

  const handleGroupColumnSelect = (attributeId: string) => {
    if (!attributeId) {
      setPendingGroupColumnId('');
      return;
    }

    if (groupedColumnIds.includes(attributeId)) {
      setPendingGroupColumnId('');
      return;
    }

    const groupedInsertIndex = groupedColumnIds.length;

    setSelectedAttributes((prev) => {
      const currentIndex = prev.findIndex((attr) => attr.id === attributeId);
      if (currentIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(groupedInsertIndex, 0, moved);
      return next;
    });

    setGroupedColumnIds((prev) => [...prev, attributeId]);
    setSortColumnIds((prev) => prev.filter((id) => id !== attributeId));
    setPendingGroupColumnId('');
  };

  const removeGroupedColumn = (attributeId: string) => {
    const nextGrouped = groupedColumnIds.filter((id) => id !== attributeId);

    setSelectedAttributes((prev) => {
      const currentIndex = prev.findIndex((attr) => attr.id === attributeId);
      if (currentIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(nextGrouped.length, 0, moved);
      return next;
    });

    setGroupedColumnIds(nextGrouped);
  };

  const handleDisplayAsColumnsSelect = (attributeId: string) => {
    if (!attributeId) {
      setDisplayAsColumnsAttributeId('');
      return;
    }

    setDisplayAsColumnsAttributeId(attributeId);
    setGroupedColumnIds((prev) => prev.filter((id) => id !== attributeId));
    setSortColumnIds((prev) => prev.filter((id) => id !== attributeId));
    setPendingGroupColumnId((prev) => (prev === attributeId ? '' : prev));
    setPendingSortColumnId((prev) => (prev === attributeId ? '' : prev));
  };

  const handleSortColumnSelect = (attributeId: string) => {
    if (!attributeId) {
      setPendingSortColumnId('');
      return;
    }

    if (groupedColumnIds.includes(attributeId)) {
      setPendingSortColumnId('');
      return;
    }

    setSortColumnIds((prev) => (prev.includes(attributeId) ? prev : [...prev, attributeId]));
    setPendingSortColumnId('');
  };

  const removeSortColumn = (attributeId: string) => {
    setSortColumnIds((prev) => prev.filter((id) => id !== attributeId));
  };

  const handleSortDragStart = (attributeId: string) => {
    setDraggedSortColumnId(attributeId);
  };

  const handleSortDragOver = (event: React.DragEvent<HTMLDivElement>, attributeId: string) => {
    event.preventDefault();
    if (attributeId !== draggedSortColumnId) {
      setDragOverSortColumnId(attributeId);
    }
  };

  const handleSortDrop = (targetAttributeId: string) => {
    if (!draggedSortColumnId || draggedSortColumnId === targetAttributeId) {
      setDraggedSortColumnId(null);
      setDragOverSortColumnId(null);
      return;
    }

    setSortColumnIds((prev) => {
      const fromIndex = prev.indexOf(draggedSortColumnId);
      const toIndex = prev.indexOf(targetAttributeId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });

    setDraggedSortColumnId(null);
    setDragOverSortColumnId(null);
  };

  const handleSortDragEnd = () => {
    setDraggedSortColumnId(null);
    setDragOverSortColumnId(null);
  };

  const getSelectedDateAttributesForFilter = (currentAttributeId: string) => {
    return selectedAttributes
      .filter((attr) => attr.attributeType === 'date' && attr.id !== currentAttributeId)
      .map((attr) => ({
        id: attr.id,
        name: attr.attributeName,
        columnName: attr.columnName || `${attr.attributeName} (${attr.objectName})`,
      }));
  };

  const getMainObjectAvailableAttributes = () => {
    if (!mainObject) return [] as AvailableObjectAttribute[];
    return getObjectAttributes(mainObject.themeId, mainObject.objectId);
  };

  const getNavigationPathKey = (path: NavigationPath = []) =>
    path
      .map((item) => `${item.sourceObjectName ?? ''}:${item.relationLabel ?? ''}:${item.objectName}:${item.cardinalityName ?? ''}`)
      .join('>');

  const getMainObjectStage2Groups = (availableAttributes: AvailableObjectAttribute[]) => {
    if (!mainObject) return [] as Stage2ObjectGroup[];

    const themeById = new Map(dataStructure.map((theme) => [theme.id, theme] as const));
    const objectByKey = new Map(
      dataStructure.flatMap((theme) =>
        theme.objects.map((obj) => [`${theme.id}::${obj.id}`, { theme, obj }] as const)
      )
    );

    const groups: Array<Omit<Stage2ObjectGroup, 'attributes'>> = [];
    const mainObjectKey = `${mainObject.themeId}::${mainObject.objectId}`;
    const mainObjectEntry = objectByKey.get(mainObjectKey as `${string}::${string}`);
    const isMainObjectChooseOne = mainObjectEntry?.obj.defaultDateFiltering === 'chooseOne';

    const getRelationDisplayLabel = (relationLabel: string | undefined, objectName: string, currentObjectName: string) => {
      const trimmed = relationLabel?.trim();
      if (!trimmed) return objectName;
      if (trimmed.toLocaleLowerCase() === currentObjectName.trim().toLocaleLowerCase()) {
        return objectName;
      }
      return trimmed;
    };

    const walk = (
      themeId: string,
      objectId: string,
      label: string,
      navigationPath: NavigationPath,
      cardinality: string,
      isSelectable: boolean,
      parentKey: string | undefined,
      depth: number,
      branchVisited: Set<string>
    ) => {
      const currentKey = `${themeId}::${objectId}`;
      const found = objectByKey.get(currentKey as `${string}::${string}`);
      if (!found) return;

      if (
        isMainObjectChooseOne
        && navigationPath.length > 0
        && found.obj.defaultDateFiltering === 'choosePeriod'
      ) {
        return;
      }

      const groupKey = navigationPath.length === 0 ? currentKey : `${currentKey}::${getNavigationPathKey(navigationPath)}`;

      groups.push({
        key: groupKey,
        parentKey,
        depth,
        label,
        objectName: found.obj.name,
        tooltip: found.obj.tooltip,
        themeId,
        themeName: found.theme.name,
        objectId,
        cardinality,
        navigationPath,
        isSelectable,
        objectSupportsApplicable: !!(found.obj.applicationDate || found.obj.isApplicable),
        objectApplicationDateMandatory: !!found.obj.applicationDateConfig?.mandatory,
        objectApplicationDateRequirementMode: found.obj.applicationDateConfig?.requirementMode ?? 'day',
      });

      if (!isSelectable) return;

      const nextVisited = new Set(branchVisited);
      nextVisited.add(currentKey);

      for (const relation of found.obj.relations ?? []) {

        const relationTargetKey = `${relation.targetThemeId}::${relation.targetObjectId}`;
        if (nextVisited.has(relationTargetKey)) continue;

        const childFound = objectByKey.get(relationTargetKey as `${string}::${string}`);
        if (!childFound) continue;

        const childPath = [
          ...navigationPath,
          {
            objectName: relation.targetObjectName,
            cardinalityName: relation.cardinality,
            relationLabel: relation.label,
            sourceObjectName: found.obj.name,
          },
        ];

        walk(
          relation.targetThemeId,
          relation.targetObjectId,
          getRelationDisplayLabel(relation.label, relation.targetObjectName, found.obj.name),
          childPath,
          relation.cardinality ?? relation.cardinalityFrom,
          isSingleRelationCardinality(relation.cardinality),
          groupKey,
          depth + 1,
          nextVisited
        );
      }

      for (const [sourceKey, sourceEntry] of objectByKey.entries()) {
        if (nextVisited.has(sourceKey)) continue;

        const inboundRelation = (sourceEntry.obj.relations ?? []).find(
          (relation) =>
            relation.targetThemeId === themeId
            && relation.targetObjectId === objectId
        );

        if (!inboundRelation) continue;

        const childPath = [
          ...navigationPath,
          {
            objectName: sourceEntry.obj.name,
            cardinalityName: inboundRelation.cardinalityFrom ?? inboundRelation.cardinality,
            relationLabel: inboundRelation.label,
            sourceObjectName: found.obj.name,
          },
        ];

        walk(
          sourceEntry.theme.id,
          sourceEntry.obj.id,
          getRelationDisplayLabel(inboundRelation.label, sourceEntry.obj.name, found.obj.name),
          childPath,
          inboundRelation.cardinalityFrom ?? '1',
          isSingleRelationCardinality(inboundRelation.cardinalityFrom),
          groupKey,
          depth + 1,
          nextVisited
        );
      }
    };

    const rootTheme = themeById.get(mainObject.themeId);
    const rootObject = rootTheme?.objects.find((obj) => obj.id === mainObject.objectId);
    if (!rootTheme || !rootObject) return [] as Stage2ObjectGroup[];

    walk(
      mainObject.themeId,
      mainObject.objectId,
      mainObject.objectName,
      [],
      rootObject.cardinality,
      true,
      undefined,
      0,
      new Set<string>()
    );

    return groups.map((group) => {
      const pathKey = getNavigationPathKey(group.navigationPath);
      return {
        ...group,
        attributes: group.isSelectable
          ? availableAttributes
              .filter(
                (attr) =>
                  attr.sourceThemeId === group.themeId
                  && attr.sourceObjectId === group.objectId
                  && getNavigationPathKey(attr.relativeNavigationPath) === pathKey
              )
              .sort((a, b) => a.rawName.localeCompare(b.rawName, 'fr', { sensitivity: 'base' }))
          : [],
      };
    });
  };

  const getMainObjectSelectedAttributeIds = (availableAttributes: AvailableObjectAttribute[]) => {
    const availableIds = new Set(availableAttributes.map((attr) => attr.id));
    return new Set(
      selectedAttributes
        .filter(
          (attr) =>
            (attr.insertionType === 'normal' || attr.insertionType === 'applicable')
            && availableIds.has(attr.attributeId)
        )
        .map((attr) => attr.attributeId)
    );
  };

  const buildMainObjectSelectedAttributes = (attributesToSelect: AvailableObjectAttribute[]) => {
    return attributesToSelect.map((attr) =>
      buildSelectedAttribute({
        themeId: attr.sourceThemeId,
        themeName: attr.sourceThemeName,
        objectId: attr.sourceObjectId,
        objectName: attr.sourceObjectName,
        attributeId: attr.id,
        attributeName: attr.rawName,
        attributeType: attr.type,
        insertionType: attr.sourceObjectSupportsApplicable && attr.sourceObjectApplicationDateMandatory ? 'applicable' : 'normal',
        isApplicable: attr.sourceObjectSupportsApplicable && attr.sourceObjectApplicationDateMandatory,
        dateReference: attr.sourceObjectSupportsApplicable && attr.sourceObjectApplicationDateMandatory
          ? { type: 'today' }
          : undefined,
        navigationPath: attr.relativeNavigationPath,
      })
    );
  };

  const replaceMainObjectSelection = (attributesToSelect: AvailableObjectAttribute[]) => {
    const availableAttributes = getMainObjectAvailableAttributes();
    const availableIds = new Set(availableAttributes.map((attr) => attr.id));

    setSelectedAttributes((prev) => {
      const preserved = prev.filter(
        (attr) =>
          !(attr.insertionType === 'normal' || attr.insertionType === 'applicable')
          || !availableIds.has(attr.attributeId)
      );
      const nextSelection = buildMainObjectSelectedAttributes(attributesToSelect);
      return appendUniqueAttributes(preserved, nextSelection);
    });
  };

  const toggleMainObjectAttribute = (attribute: AvailableObjectAttribute, checked: boolean) => {
    const availableAttributes = getMainObjectAvailableAttributes();
    const selectedIds = getMainObjectSelectedAttributeIds(availableAttributes);
    if (checked) selectedIds.add(attribute.id);
    else selectedIds.delete(attribute.id);

    const nextAttributes = availableAttributes.filter((candidate) => selectedIds.has(candidate.id));
    replaceMainObjectSelection(nextAttributes);
  };

  const applyMainObjectQuickSelection = (
    mode: 'smart' | 'all' | 'none',
    groupAttributes: AvailableObjectAttribute[]
  ) => {
    const availableAttributes = getMainObjectAvailableAttributes();
    const selectedIds = getMainObjectSelectedAttributeIds(availableAttributes);

    for (const attr of groupAttributes) {
      if (mode === 'none') {
        selectedIds.delete(attr.id);
      } else if (mode === 'all' || attr.smartSel) {
        selectedIds.add(attr.id);
      } else {
        selectedIds.delete(attr.id);
      }
    }

    const nextAttributes = availableAttributes.filter((attr) => selectedIds.has(attr.id));
    replaceMainObjectSelection(nextAttributes);
  };

  const getMainObjectAttributeDisplayLabel = (attr: AvailableObjectAttribute) => attr.rawName;

  const selectAllVisibleAttributes = () => {
    const availableAttributes = getMainObjectAvailableAttributes();
    const selectedIds = getMainObjectSelectedAttributeIds(availableAttributes);
    for (const group of visibleMainObjectStage2Groups) {
      if (!group.isSelectable) continue;
      for (const attr of group.attributes) {
        selectedIds.add(attr.id);
      }
    }
    const nextAttributes = availableAttributes.filter((attr) => selectedIds.has(attr.id));
    replaceMainObjectSelection(nextAttributes);
  };

  const deselectAllSelectedAttributes = () => {
    const defaultTemporalContext = createDefaultTemporalContext();
    const defaultChosenDate = defaultTemporalContext.periodEndDate ?? defaultTemporalContext.reportDate;
    const defaultChosenPeriodStart = defaultTemporalContext.periodStartDate ?? addMonthsIsoDate(defaultTemporalContext.reportDate, -12);
    const defaultChosenPeriodEnd = defaultTemporalContext.periodEndDate ?? defaultTemporalContext.reportDate;

    setSelectedAttributes([]);
    setGlobalFilterGroups(undefined);
    setReportTemporalContext(defaultTemporalContext);
    setReportChosenDate(defaultChosenDate);
    setReportChosenPeriodStart(defaultChosenPeriodStart);
    setReportChosenPeriodEnd(defaultChosenPeriodEnd);
    setIncludeDepartedCollaborators(false);
    setIncludePresentCollaborators(true);
    setIncludeFutureNewCollaborators(false);
    setIncludeFutureReturnCollaborators(false);
    setSelectedCollaboratorName('');
    setSelectedQualificationFilters([]);
    setSelectedDepartmentFilters([]);
    setSelectedEstablishmentFilters([]);
  };

  const normalizeSearchText = (value: string) => value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const openStage2MultiObjectDialog = (
    group: Stage2ObjectGroup,
    preset: 'aggregation' | 'first' | 'last' | 'applicable' | 'selection',
    options?: { collaboratorMultiTile?: boolean }
  ) => {
    const theme = dataStructure.find((candidate) => candidate.id === group.themeId);
    const obj = theme?.objects.find((candidate) => candidate.id === group.objectId);
    if (!theme || !obj) return;

    const initialConfig = preset === 'aggregation'
      ? undefined
      : preset === 'selection'
      ? {
          insertionType: 'last' as const,
        }
      : preset === 'applicable'
      ? {
          insertionType: 'applicable' as const,
          dateReference: { type: 'today' as const },
        }
      : {
          insertionType: preset,
        };

    setPendingObjectInsertion({
      themeId: group.themeId,
      themeName: group.themeName,
      objectId: group.objectId,
      objectName: group.objectName,
      cardinality: group.cardinality,
      mode: preset === 'aggregation' ? 'aggregation' : (preset === 'applicable' || preset === 'selection') ? 'special' : 'operation',
      isApplicable: group.objectSupportsApplicable,
      applicationDateMandatory: group.objectApplicationDateMandatory,
      applicationDateRequirementMode: group.objectApplicationDateRequirementMode ?? 'day',
      smartObjects: obj.smartObjects,
      navigationPath: group.navigationPath,
      initialConfig,
      collaboratorMultiTile: !!options?.collaboratorMultiTile,
      ownObjectOnly: true,
    });
    setObjectInsertionDialogOpen(true);
  };

  const editingAttribute = selectedAttributes.find((attr) => attr.id === editingAttributeId);
  const mainObjectSmartObjects = selectingMainObject ? [] : getMainObjectSmartObjects();
  const mainObjectAvailableAttributes = selectingMainObject ? [] : getMainObjectAvailableAttributes();
  const mainObjectStage2Groups = useMemo(
    () => (selectingMainObject ? [] as Stage2ObjectGroup[] : getMainObjectStage2Groups(mainObjectAvailableAttributes)),
    [selectingMainObject, mainObjectAvailableAttributes]
  );
  useEffect(() => {
    const validGroupKeys = new Set(mainObjectStage2Groups.map((group) => group.key));
    setCollapsedAvailableGroupKeys((prev) => {
      const next = prev.filter((key) => validGroupKeys.has(key));
      if (next.length === prev.length && next.every((key, index) => key === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [mainObjectStage2Groups]);
  const applicableTileKeys = useMemo(() => {
    const keys: string[] = [];

    const collect = (nodes: ContractPosteTargetTileNode[], parentPath = '') => {
      for (const node of nodes) {
        const tileKey = parentPath ? `${parentPath}>${node.key}` : node.key;
        keys.push(tileKey);
        if (node.children.length > 0) {
          collect(node.children, tileKey);
        }
      }
    };

    collect(contractPosteTargetTileNodes);
    return keys;
  }, [contractPosteTargetTileNodes]);
  useEffect(() => {
    setCollapsedApplicableTileKeys((prev) => {
      const validKeySet = new Set(applicableTileKeys);
      const nextKeySet = new Set(prev.filter((key) => validKeySet.has(key)));
      let changed = nextKeySet.size !== prev.length;

      for (const key of applicableTileKeys) {
        if (nextKeySet.has(key)) continue;
        nextKeySet.add(key);
        changed = true;
      }

      return changed ? Array.from(nextKeySet) : prev;
    });
  }, [applicableTileKeys]);
  const orderedMainObjectStage2Groups = useMemo(() => {
    if (!mainObject) return mainObjectStage2Groups;

    const getGroupPriority = (group: Stage2ObjectGroup) => {
      if (
        group.themeId === mainObject.themeId
        && group.objectId === mainObject.objectId
        && group.navigationPath.length === 0
      ) {
        return 0;
      }

      if (group.themeId === mainObject.themeId) {
        return 1;
      }

      return 2;
    };

    return [...mainObjectStage2Groups].sort((left, right) => {
      const priorityDiff = getGroupPriority(left) - getGroupPriority(right);
      if (priorityDiff !== 0) return priorityDiff;

      const labelDiff = left.label.localeCompare(right.label, 'fr', { sensitivity: 'base' });
      if (labelDiff !== 0) return labelDiff;

      return left.objectName.localeCompare(right.objectName, 'fr', { sensitivity: 'base' });
    });
  }, [mainObject, mainObjectStage2Groups]);
  useEffect(() => {
    if (!pendingInitialAvailableGroupsCollapse) return;

    const firstGroup = orderedMainObjectStage2Groups[0];
    if (!firstGroup) {
      setPendingInitialAvailableGroupsCollapse(false);
      return;
    }

    setCollapsedAvailableGroupKeys(
      orderedMainObjectStage2Groups
        .filter((group) => group.key !== firstGroup.key)
        .map((group) => group.key)
    );
    setPendingInitialAvailableGroupsCollapse(false);
  }, [orderedMainObjectStage2Groups, pendingInitialAvailableGroupsCollapse]);
  const mainObjectSelectedAttributeIds = selectingMainObject
    ? new Set<string>()
    : getMainObjectSelectedAttributeIds(mainObjectAvailableAttributes);
  const normalizedAvailableAttributeSearch = normalizeSearchText(availableAttributeSearchTerm.trim());
  const filteredMainObjectStage2Groups = normalizedAvailableAttributeSearch
    ? orderedMainObjectStage2Groups
        .map((group) => {
          const objectMatchesSearch =
            normalizeSearchText(group.objectName).includes(normalizedAvailableAttributeSearch);

          // If the object card itself matches, keep all its attributes.
          if (objectMatchesSearch) {
            return group;
          }

          if (!group.isSelectable) return null;

          // If only attribute names match, keep only matching attributes.
          const matchingAttributes = group.attributes.filter((attr) => {
            const attributeLabel = normalizeSearchText(getMainObjectAttributeDisplayLabel(attr));
            return attributeLabel.includes(normalizedAvailableAttributeSearch);
          });

          if (matchingAttributes.length === 0) return null;
          return { ...group, attributes: matchingAttributes };
        })
        .filter((group): group is Stage2ObjectGroup => group !== null)
      : orderedMainObjectStage2Groups;
  const mainObjectStage2GroupByKey = useMemo(
    () => new Map(orderedMainObjectStage2Groups.map((group) => [group.key, group] as const)),
    [orderedMainObjectStage2Groups]
  );
  const filteredMainObjectStage2GroupKeys = useMemo(
    () => new Set(filteredMainObjectStage2Groups.map((group) => group.key)),
    [filteredMainObjectStage2Groups]
  );
  const searchForcedExpandedGroupKeys = useMemo(() => {
    if (!normalizedAvailableAttributeSearch) return new Set<string>();

    const forced = new Set<string>();
    for (const group of filteredMainObjectStage2Groups) {
      // Auto-expand the matching group itself so matching attributes are immediately visible.
      forced.add(group.key);

      let parentKey = group.parentKey;
      while (parentKey) {
        forced.add(parentKey);
        parentKey = mainObjectStage2GroupByKey.get(parentKey)?.parentKey;
      }
    }

    return forced;
  }, [filteredMainObjectStage2Groups, mainObjectStage2GroupByKey, normalizedAvailableAttributeSearch]);
  const renderCandidateMainObjectStage2GroupKeys = useMemo(() => {
    if (!normalizedAvailableAttributeSearch) {
      return new Set(orderedMainObjectStage2Groups.map((group) => group.key));
    }

    const candidateKeys = new Set<string>(filteredMainObjectStage2GroupKeys);
    for (const group of filteredMainObjectStage2Groups) {
      let parentKey = group.parentKey;
      while (parentKey) {
        candidateKeys.add(parentKey);
        parentKey = mainObjectStage2GroupByKey.get(parentKey)?.parentKey;
      }
    }

    return candidateKeys;
  }, [
    filteredMainObjectStage2GroupKeys,
    filteredMainObjectStage2Groups,
    mainObjectStage2GroupByKey,
    normalizedAvailableAttributeSearch,
    orderedMainObjectStage2Groups,
  ]);
  const visibleMainObjectStage2Groups = useMemo(() => {
    const collapsedKeys = new Set(collapsedAvailableGroupKeys);
    for (const key of searchForcedExpandedGroupKeys) {
      collapsedKeys.delete(key);
    }

    return orderedMainObjectStage2Groups.filter((group) => {
      if (!renderCandidateMainObjectStage2GroupKeys.has(group.key)) {
        return false;
      }

      let parentKey = group.parentKey;
      while (parentKey) {
        if (collapsedKeys.has(parentKey)) {
          return false;
        }
        parentKey = mainObjectStage2GroupByKey.get(parentKey)?.parentKey;
      }

      return true;
    });
  }, [
    collapsedAvailableGroupKeys,
    mainObjectStage2GroupByKey,
    orderedMainObjectStage2Groups,
    renderCandidateMainObjectStage2GroupKeys,
    searchForcedExpandedGroupKeys,
  ]);
  const visibleMainObjectStage2GroupsByParentKey = useMemo(() => {
    const grouped = new Map<string, Stage2ObjectGroup[]>();

    for (const group of visibleMainObjectStage2Groups) {
      const parentKey = group.parentKey ?? '__root__';
      const existing = grouped.get(parentKey);
      if (existing) {
        existing.push(group);
      } else {
        grouped.set(parentKey, [group]);
      }
    }

    return grouped;
  }, [visibleMainObjectStage2Groups]);
  const visibleMainObjectStage2RootGroups = visibleMainObjectStage2GroupsByParentKey.get('__root__') ?? [];
  const linkedMultiCardinalityDialogObjects = useMemo(() => {
    if (!linkedMultiCardinalityDialogGroup) return [] as LinkedMultiCardinalityObject[];
    return getLinkedMultipleCardinalityObjects(linkedMultiCardinalityDialogGroup);
  }, [linkedMultiCardinalityDialogGroup]);
  const renderContractPosteTargetTileNodes = (
    nodes: ContractPosteTargetTileNode[],
    parentPath = '',
    parentLabels: string[] = []
  ) => {
    return nodes.map((node) => (
      (() => {
        const tileKey = parentPath ? `${parentPath}>${node.key}` : node.key;
        const isCollapsed = collapsedApplicableTileKeys.includes(tileKey);
        const collaboratorScopeLabel = selectedCollaboratorTarget
          ? `Collaborateur (${selectedCollaboratorTarget})`
          : 'Collaborateur';
        const relationScopeParts = [...parentLabels].reverse();
        relationScopeParts.push(collaboratorScopeLabel);
        const relationScopeLabel = relationScopeParts.join(' < ');

        return (
      <div key={tileKey} className="space-y-2">
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => toggleApplicableTileCollapsed(tileKey)}
              className="flex items-center gap-1 rounded px-1 py-0.5 text-left text-sm font-semibold text-indigo-900 hover:bg-indigo-100"
              title={isCollapsed ? 'Déplier cette tuile' : 'Replier cette tuile'}
            >
              <span className="text-[10px] text-indigo-600">{isCollapsed ? '>' : 'v'}</span>
              <span className="flex flex-col">
                <span>{node.label}</span>
                <span className="text-[10px] font-normal text-indigo-700">({relationScopeLabel})</span>
              </span>
            </button>
            <div className="flex items-center gap-2">
              {node.attributes.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-indigo-700">
                  <button
                    type="button"
                    onClick={() => applyContractPosteTargetTileSelection('smart', node.attributes)}
                    className="rounded px-1.5 py-0.5 hover:bg-indigo-100"
                  >
                    par défaut
                  </button>
                  <span className="text-indigo-300">|</span>
                  <button
                    type="button"
                    onClick={() => applyContractPosteTargetTileSelection('all', node.attributes)}
                    className="rounded px-1.5 py-0.5 hover:bg-indigo-100"
                  >
                    tous
                  </button>
                  <span className="text-indigo-300">|</span>
                  <button
                    type="button"
                    onClick={() => applyContractPosteTargetTileSelection('none', node.attributes)}
                    className="rounded px-1.5 py-0.5 hover:bg-indigo-100"
                  >
                    aucun
                  </button>
                </div>
              )}
              {node.attributes.length > 0 && (
                <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-indigo-700">
                  date ciblée
                </span>
              )}
            </div>
          </div>

          {!isCollapsed && (node.attributes.length > 0 ? (
            <div className="space-y-2">
              {node.attributes.map((attr) => {
                const checked = isContractPosteTargetedAttributeSelected(attr);
                return (
                  <label
                    key={`${node.key}-${attr.id}`}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded border border-indigo-100 bg-white px-3 py-2 text-sm hover:bg-indigo-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggleContractPosteTargetedAttribute(attr, event.target.checked)}
                      />
                      <span className="text-gray-800">{attr.rawName}</span>
                      <InfoHint text={attr.tooltip ?? attr.description} />
                    </div>
                    {!!attr.magicSel && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                        par defaut
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-indigo-700">Aucun attribut disponible.</div>
          ))}
        </div>

        {!isCollapsed && node.children.length > 0 && (
          <div className="ml-4 space-y-2 border-l border-indigo-200 pl-3">
            {renderContractPosteTargetTileNodes(node.children, tileKey, [...parentLabels, node.label])}
          </div>
        )}
      </div>
      );
      })()
    ));
  };
  const renderAvailableStage2GroupCards = (groups: Stage2ObjectGroup[]) => {
    return groups.map((group) => {
      const isCollapsed = collapsedAvailableGroupKeys.includes(group.key);
      const childGroups = visibleMainObjectStage2GroupsByParentKey.get(group.key) ?? [];
      const linkedMultipleCardinalityObjects = getLinkedMultipleCardinalityObjects(group);
      const isCollaboratorGroup = normalizeObjectToken(group.objectName) === 'collaborateur';
      const normalizedGroupObjectName = normalizeObjectToken(group.objectName);
      const isContractOrPosteGroup = normalizedGroupObjectName === 'contrats'
        || normalizedGroupObjectName === 'contrat'
        || normalizedGroupObjectName === 'postes'
        || normalizedGroupObjectName === 'poste';
      const normalizedThemeName = normalizeObjectToken(group.themeName);
      const normalizedThemeId = normalizeObjectToken(group.themeId);
      const isCollaboratorDomainGroup = normalizedThemeName === 'les collaborateurs'
        || normalizedThemeId === 'les-collaborateurs';
      const groupDefinition = dataStructure
        .find((theme) => theme.id === group.themeId)
        ?.objects.find((obj) => obj.id === group.objectId);
      const hasManyToOneRelationToCollaborator = !!(groupDefinition?.relations ?? []).some(
        (relation) =>
          normalizeObjectToken(relation.targetObjectName) === 'collaborateur'
          && !!relation.cardinalityFrom?.includes('n')
          && !relation.cardinality.includes('n')
      );
      const isCollaboratorMultipleCardinalitySpecialTile = !group.isSelectable
        && isCollaboratorDomainGroup
        && !isContractOrPosteGroup
        && hasManyToOneRelationToCollaborator;

      return (
        <div key={group.key} className="space-y-2">
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                  <button
                    type="button"
                    onClick={() => toggleAvailableGroupCollapsed(group.key)}
                    className="flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-gray-100"
                    title={isCollapsed ? 'Déplier cet objet' : 'Replier cet objet'}
                  >
                    <span className="text-[10px] text-gray-500">{isCollapsed ? '>' : 'v'}</span>
                    <span>
                      {group.label !== group.objectName
                        ? `${group.label} (${group.objectName})`
                        : group.label}
                    </span>
                  </button>
                  <InfoHint text={group.tooltip} />
                </div>
                {showLinkedObjectCardinalities && group.navigationPath.length > 0 && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                    {group.navigationPath.length === 1
                      ? group.navigationPath[0].sourceObjectName
                      : (group.navigationPath[0].relationLabel ?? group.navigationPath[0].sourceObjectName)
                    } · {group.cardinality}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showOtherCardinalitiesButton && linkedMultipleCardinalityObjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLinkedMultiCardinalityDialogGroup(group)}
                    className="rounded border border-teal-300 bg-teal-50 px-2 py-1 text-xs text-teal-800 hover:bg-teal-100"
                  >
                    autre cardinalités ({linkedMultipleCardinalityObjects.length})
                  </button>
                )}
                {group.isSelectable ? (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <button
                      onClick={() => applyMainObjectQuickSelection('smart', group.attributes)}
                      className="rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-600"
                    >
                      par défaut
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => applyMainObjectQuickSelection('all', group.attributes)}
                      className="rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-600"
                    >
                      tous
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => applyMainObjectQuickSelection('none', group.attributes)}
                      className="rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-600"
                    >
                      aucun
                    </button>
                  </div>
                ) : !isCollapsed ? (
                  <div className="text-xs text-gray-500">Relation multiple</div>
                ) : null}
              </div>
            </div>

            {!isCollapsed && group.isSelectable ? (
              <div className="space-y-2">
                {group.attributes.map((attr) => {
                  const checked = mainObjectSelectedAttributeIds.has(attr.id);
                  return (
                    <label
                      key={attr.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleMainObjectAttribute(attr, event.target.checked)}
                        />
                        <span className="text-gray-800">{getMainObjectAttributeDisplayLabel(attr)}</span>
                        <InfoHint text={attr.tooltip ?? attr.description} />
                      </div>
                      {!!attr.smartSel && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                          par défaut
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : !isCollapsed ? (
              <div className="rounded border border-cyan-300 bg-cyan-50 p-3 text-sm text-cyan-900">
                <div className="mb-2">
                  {isCollaboratorMultipleCardinalitySpecialTile
                    ? 'Objet multi-instance lié à Collaborateur.'
                    : 'Objet multi-instance.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openStage2MultiObjectDialog(group, 'selection')}
                    className="rounded border border-cyan-300 bg-white px-3 py-1.5 text-sm text-cyan-800 hover:bg-cyan-100"
                  >
                    Sélection d'une instance
                  </button>
                  <button
                    onClick={() => openStage2MultiObjectDialog(group, 'aggregation')}
                    className="rounded border border-cyan-300 bg-cyan-100 px-3 py-1.5 text-sm text-cyan-900 hover:bg-cyan-200"
                  >
                    Opération sur les instances
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {!isCollapsed && isCollaboratorGroup && contractPosteTargetTileNodes.length > 0 && (
            <div className="mt-3 ml-4 space-y-2 border-l border-indigo-200 pl-3">
              {renderContractPosteTargetTileNodes(contractPosteTargetTileNodes)}
            </div>
          )}

          {!isCollapsed && childGroups.length > 0 && (
            <div className="ml-4 space-y-2 border-l border-gray-200 pl-3">
              {renderAvailableStage2GroupCards(childGroups)}
            </div>
          )}
        </div>
      );
    });
  };
  const groupableSelectedAttributes = getGroupableSelectedAttributes();
  const groupableById = new Map(groupableSelectedAttributes.map((attr) => [attr.id, attr] as const));
  const availableGroupPickers = groupableSelectedAttributes
    .filter((attr) => !groupedColumnIds.includes(attr.id) && attr.id !== displayAsColumnsAttributeId)
    .sort(compareSelectedAttributesByAttributeThenContext);
  const sortableSelectedAttributes = getSortableSelectedAttributes();
  const sortableById = new Map(sortableSelectedAttributes.map((attr) => [attr.id, attr] as const));
  const availableSortPickers = sortableSelectedAttributes
    .filter((attr) => !sortColumnIds.includes(attr.id) && !groupedColumnIds.includes(attr.id) && attr.id !== displayAsColumnsAttributeId)
    .sort(compareSelectedAttributesByAttributeThenContext);
  const availableGroupPickerGroups = buildSelectedAttributeOptionGroups(availableGroupPickers);
  const availableSortPickerGroups = buildSelectedAttributeOptionGroups(availableSortPickers);
  const displayAsColumnsPickers = groupableSelectedAttributes
    .sort(compareSelectedAttributesByAttributeThenContext);
  const mainObjectLinkedToCollaborateur = !!(
    !selectingMainObject
    && mainObject
    && isObjectLinkedToCollaborateur(mainObject.themeId, mainObject.objectId)
  );
  const activeCollaboratorStatusLabels = [
    includeDepartedCollaborators ? 'partis' : null,
    includePresentCollaborators ? 'présents' : null,
    includeFutureNewCollaborators ? 'nouveaux' : null,
    includeFutureReturnCollaborators ? 'retours' : null,
  ].filter((label): label is string => label !== null);
  const activeCollaboratorStatusSummary =
    activeCollaboratorStatusLabels.length === 0
      ? 'aucun'
      : activeCollaboratorStatusLabels.length === 1
      ? activeCollaboratorStatusLabels[0]
      : `${activeCollaboratorStatusLabels.slice(0, -1).join(', ')} et ${activeCollaboratorStatusLabels[activeCollaboratorStatusLabels.length - 1]}`;
  const collaboratorDepartmentSummary =
    selectedDepartmentFilters.length === 0
      ? 'Dpt. tous'
      : `${selectedDepartmentFilters.length} Dpt.`;
  const collaboratorEstablishmentSummary =
    selectedEstablishmentFilters.length === 0
      ? 'Etab. tous'
      : `${selectedEstablishmentFilters.length} Etab.`;
  const collaboratorContractTypeSummary =
    selectedContractTypeFilters.length === 0
      ? 'Contrat. tous'
      : `${selectedContractTypeFilters.length} Contrat.`;
  const collaboratorQualificationSummary =
    selectedQualificationFilters.length === 0
      ? 'Qualif. toutes'
      : `${selectedQualificationFilters.length} Qualif.`;
  const collaboratorManagerHeaderSummary = selectedManagerCollaboratorName
    ? `Manager du collaborateur: ${selectedManagerCollaboratorName}${includeManagerDescendants ? ' (avec descendance managériale)' : ''}`
    : '';
  const hasActiveOrgFilters =
    selectedManagerCollaboratorName.trim().length > 0 ||
    selectedContractTypeFilters.length > 0 ||
    selectedQualificationFilters.length > 0 ||
    selectedDepartmentFilters.length > 0 ||
    selectedEstablishmentFilters.length > 0;
  const hasSpecificCollaboratorSelected = selectedCollaboratorName.trim().length > 0;
  const hasAnyCollaboratorFiltersApplied = hasSpecificCollaboratorSelected || hasActiveOrgFilters;
  const hasTargetedApplicableInsertions = selectedAttributes.some(
    (attr) => attr.insertionType === 'applicable' && attr.lockedDateReferenceLabel === 'date ciblée'
  );
  const isContractPosteTargetSelectorEnabled = hasAnyCollaboratorFiltersApplied || hasTargetedApplicableInsertions;
  const collaboratorHeaderSummary = [
    ...(hasAnyCollaboratorFiltersApplied ? [`Collaborateur concerné: ${selectedCollaboratorTarget || 'non défini'}`] : []),
    ...(selectedCollaboratorName ? [`Un collaborateur précis: ${selectedCollaboratorName}`] : []),
    ...(collaboratorManagerHeaderSummary ? [collaboratorManagerHeaderSummary] : []),
    ...(selectedContractTypeFilters.length > 0 ? [`Types contrat: ${selectedContractTypeFilters.length}`] : []),
    ...(selectedQualificationFilters.length > 0 ? [`Qualifications: ${selectedQualificationFilters.length}`] : []),
    ...(selectedDepartmentFilters.length > 0 ? [`Départements: ${selectedDepartmentFilters.length}`] : []),
    ...(selectedEstablishmentFilters.length > 0 ? [`Etablissements: ${selectedEstablishmentFilters.length}`] : []),
  ].join(' · ');
  const collaboratorHeaderSummaryLabel = collaboratorHeaderSummary || 'Aucun filtre collaborateur appliqué';
  const collaboratorContractDateLabel = getContractPosteLotDateLabel(
    collaboratorContractDateMode,
    selectedCollaboratorContractDateColumnId
  );
  const collaboratorTargetingLines = [
    `Collaborateur concerné: ${selectedCollaboratorTarget || 'non défini'}`,
    `Date cible contrats/postes: ${collaboratorContractDateLabel}`,
    `Un collaborateur précis: ${selectedCollaboratorName || 'Tous les collaborateurs'}`,
    `Manager du collaborateur: ${selectedManagerCollaboratorName
      ? `${selectedManagerCollaboratorName}${includeManagerDescendants ? ' (avec descendance managériale)' : ''}`
      : 'Tous les managers'}`,
    `Type du contrat: ${selectedContractTypeFilters.length > 0 ? `${selectedContractTypeFilters.length} sélection(s)` : 'Tous'}`,
    `Qualification du poste: ${selectedQualificationFilters.length > 0 ? `${selectedQualificationFilters.length} sélection(s)` : 'Toutes'}`,
    `Département du poste: ${selectedDepartmentFilters.length > 0 ? `${selectedDepartmentFilters.length} sélection(s)` : 'Tous'}`,
    `Etablissement du poste: ${selectedEstablishmentFilters.length > 0 ? `${selectedEstablishmentFilters.length} sélection(s)` : 'Tous'}`,
  ];
  const collaboratorTargetSummary = selectedCollaboratorTarget || 'Collaborateur';
  const collaboratorNameSummary = selectedCollaboratorName || 'Collab. tous';
  const collaboratorManagerSummary = selectedManagerCollaboratorName
    ? `Manager: ${selectedManagerCollaboratorName}${includeManagerDescendants ? ' (+descendance)' : ''}`
    : 'Manager: tous';
  const collaboratorOrgFilterSummaryLabel = `${collaboratorTargetSummary} - ${collaboratorNameSummary} - ${collaboratorManagerSummary} - ${collaboratorContractTypeSummary} - ${collaboratorQualificationSummary} - ${collaboratorDepartmentSummary} - ${collaboratorEstablishmentSummary}`;
  const collaboratorStatusFilterLines = getCollaboratorStatusFilterLines();
  const collaboratorOrgFilterLine = getCollaboratorOrgFilterLine();
  const collaboratorGeneratedFilterLines = [
    ...collaboratorStatusFilterLines,
    ...(collaboratorOrgFilterLine ? [collaboratorOrgFilterLine] : []),
  ];
  const departmentFilterOptions = useMemo(
    () => Array.from(new Set(flattenDepartmentTree(departmentTree))).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }),),
    [departmentTree]
  );
  const qualificationFilterOptions = useMemo(
    () => Array.from(new Set(flattenDepartmentTree(qualificationTree))).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }),),
    [qualificationTree]
  );
  const reportPreviewSourceColumns = selectedAttributes.map((attr) => ({
    id: attr.id,
    label: getSelectedAttributeDisplayName(attr),
    attributeType: attr.attributeType,
    attributeName: attr.attributeName,
    insertionType: attr.insertionType,
  }));
  const technicalFilterColumns = useMemo(() => {
    const byId = new Map<string, { id: string; label: string; attributeType: AttributeType; attributeName: string; insertionType: InsertionType }>();

    for (const group of globalFilterGroups ?? []) {
      for (const condition of group.conditions) {
        if (!condition.attributeId.startsWith(AUTO_FILTER_COLUMN_PREFIX)) continue;
        if (byId.has(condition.attributeId)) continue;

        byId.set(condition.attributeId, {
          id: condition.attributeId,
          label: condition.attributeName,
          attributeType: condition.attributeType,
          attributeName: condition.attributeName,
          insertionType: 'normal',
        });
      }
    }

    return Array.from(byId.values());
  }, [globalFilterGroups]);
  const previewColumnsForGeneration = [...reportPreviewSourceColumns, ...technicalFilterColumns];

  const refreshReportPreview = () => {
    if (!validateReportTemporalContext()) {
      return false;
    }

    const preview = generateReportPreviewRows({
      columns: previewColumnsForGeneration,
      rowCount: 20,
      temporalContext: {
        mode: mainObjectTemporalMode,
        reportDate,
        periodStartDate: reportPeriodStartDate,
        periodEndDate: reportPeriodEndDate,
        chosenDate: reportChosenDate,
        chosenPeriodStart: reportChosenPeriodStart,
        chosenPeriodEnd: reportChosenPeriodEnd,
      },
      globalFilterGroups,
      collaboratorFilterEnabled: mainObjectLinkedToCollaborateur,
      selectedCollaboratorTarget,
      selectedCollaboratorName,
      collaboratorContractDateMode,
      selectedCollaboratorContractDateColumnId,
      collaboratorTargets: collaboratorTargetOptions.map((option) => option.label),
      collaboratorUniverse: collaboratorOptions,
      selectedManagerCollaboratorName,
      includeManagerDescendants,
      selectedContractTypeFilters,
      selectedQualificationFilters,
      contractTypeUniverse: contractTypeEnumValues,
      includeDepartedCollaborators,
      includePresentCollaborators,
      includeFutureNewCollaborators,
      includeFutureReturnCollaborators,
      selectedDepartmentFilters,
      selectedEstablishmentFilters,
      qualificationUniverse: qualificationFilterOptions,
      departmentUniverse: departmentFilterOptions,
      establishmentUniverse: establishmentOptions,
      sortColumnIds,
      groupedColumnIds,
      displayAsColumnsAttributeId: showDisplayAsColumns ? (displayAsColumnsAttributeId || undefined) : undefined,
    });

    setReportPreviewColumns(preview.columns);
    setReportPreviewRows(preview.rows);
    const now = new Date();
    const formattedDate = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      now.getFullYear(),
    ].join('/');
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
    setReportPreviewLastUpdatedAt(`Actualisé le ${formattedDate} à ${formattedTime}`);
    return true;
  };

  const reportDisplayName = mainObject?.objectName ?? consultationReportTitle ?? 'Rapport';

  useEffect(() => {
    if (!reportResultOpen || !onReportDisplayNameChange) return;
    onReportDisplayNameChange(reportDisplayName);
  }, [onReportDisplayNameChange, reportDisplayName, reportResultOpen]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {!selectingMainObject && reportResultOpen ? (
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-xl font-semibold text-gray-900">
                {`Rapport : ${reportDisplayName}`}
              </h1>
              {typeof consultationIsFavorite === 'boolean' && onToggleConsultationFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleConsultationFavorite(reportDisplayName)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                  title={consultationIsFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  aria-label={consultationIsFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <span
                    className={`text-lg leading-none ${consultationIsFavorite ? 'text-yellow-400' : 'text-white'}`}
                    style={consultationIsFavorite ? undefined : { WebkitTextStroke: '1px #ca8a04' }}
                  >
                    ★
                  </span>
                </button>
              )}
            </div>
          ) : !selectingMainObject ? (
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={handleChangeReportType}
                title="Changer le type de rapport"
                aria-label="Changer le type de rapport"
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                &lt;
              </button>
              <h1 className="truncate text-xl font-semibold text-gray-900">
                {`Rapport : ${reportDisplayName}`}
              </h1>
            </div>
          ) : (
            <h1 className="truncate text-xl font-semibold text-gray-900">
              Quelle est la donnée principale du rapport ?
            </h1>
          )}

          <div className="flex shrink-0 items-center gap-3">
            {topRightActions}
          </div>
        </div>
      </div>

      {!reportResultOpen && !selectingMainObject && mainObjectSmartObjects.length > 0 && (
        <div className="border-b bg-indigo-50/40 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="shrink-0 text-sm font-medium text-indigo-900">Sélections et filtres rapide</div>
            <div className="flex flex-wrap gap-2">
              {mainObjectSmartObjects.map((smartObject) => (
                <button
                  key={smartObject.title}
                  onClick={() => applyMainObjectSmartPreset(smartObject)}
                  className="rounded border border-indigo-200 bg-white px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100"
                  title="Appliquer la sélection et les filtres du preset"
                >
                  {smartObject.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {reportResultOpen ? (
          <ReportResultDrawer
            onBackToConfiguration={handleBackToConfiguration}
            mainObjectName={reportDisplayName}
            columns={reportPreviewColumns}
            rows={reportPreviewRows}
            reportLastUpdatedAt={reportPreviewLastUpdatedAt || undefined}
            onRefreshReport={refreshReportPreview}
            mainObjectLinkedToCollaborateur={mainObjectLinkedToCollaborateur}
            collaboratorTargetingLines={
              mainObjectLinkedToCollaborateur ? collaboratorTargetingLines : []
            }
            globalFilterSummaryLines={getGlobalFilterGroupLines()}
            collaboratorTargetingSummaryLabel={collaboratorHeaderSummaryLabel}
            canEditReport={canEditReport}
            canShareReport={canShareReport}
            canSendReport={canSendReport}
            canSaveModel={canSaveModel}
            collaboratorOptions={collaboratorOptions}
            onEditGlobalFilters={() => setGlobalFilterDialogOpen(true)}
          />
        ) : selectingMainObject ? (
          <div className="flex w-full justify-center overflow-y-auto">
            <div className="w-full max-w-[1200px]">
              <MainObjectPicker
                onSelect={handleMainObjectSelect}
                preferredExpandedDomain={preferredMainObjectDomain}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="w-4/12">
              <div ref={availableDataListRef} className="h-full overflow-y-auto border-r bg-gray-50">
                <div className="sticky top-0 z-10 border-b bg-gray-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-gray-900">Données disponibles</h2>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={collapseAllAvailableObjects}
                        title="Replier tous les objets affichés"
                        className="rounded border border-gray-300 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                      >
                        plier tout
                      </button>
                      <button
                        onClick={expandAllAvailableObjects}
                        title="Déplier tous les objets affichés"
                        className="rounded border border-gray-300 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                      >
                        déplier tout
                      </button>
                      {showSelectAllButton && (
                        <button
                          onClick={selectAllVisibleAttributes}
                          title="[Debug] Sélectionner tous les attributs visibles"
                          className="rounded border border-dashed border-gray-400 px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        >
                          Tout sélectionner
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={availableAttributeSearchTerm}
                        onChange={(event) => setAvailableAttributeSearchTerm(event.target.value)}
                        placeholder="Rechercher un attribut..."
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
                      />
                      {availableAttributeSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setAvailableAttributeSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Effacer la recherche"
                          aria-label="Effacer la recherche"
                        >
                          x
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  {renderAvailableStage2GroupCards(visibleMainObjectStage2RootGroups)}

                  {visibleMainObjectStage2RootGroups.length === 0 && (
                    <div className="rounded border bg-white px-3 py-2 text-sm text-gray-500">
                      {normalizedAvailableAttributeSearch
                        ? 'Aucun attribut ne correspond à la recherche.'
                        : 'Aucun attribut disponible.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex w-3/12 flex-col border-l bg-white">
              <div className="border-b px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-semibold text-gray-900">
                    Colonnes du rapport
                  </div>
                  {showSelectAllButton && (
                    <button
                      onClick={deselectAllSelectedAttributes}
                      title="[Debug] Désélectionner tous les attributs"
                      className="rounded border border-dashed border-gray-400 px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      Tout désélectionner
                    </button>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <SelectionPanel
                  selectedAttributes={selectedAttributes}
                  groupedAttributeIds={groupedColumnIds}
                  onRemoveAttribute={handleRemoveAttribute}
                  onEditCompartment={handleEditCompartment}
                  onEditDateReference={handleEditDateReference}
                  onEditInsertionLot={handleEditInsertionLot}
                  onEditConditionalColumn={handleEditConditionalColumn}
                  onEditCalculatedColumn={handleEditCalculatedColumn}
                  onEditAggregation={handleEditAggregation}
                  onReorder={handleReorder}
                  onEditColumnName={handleEditColumnName}
                  getDateAttributeName={getDateAttributeName}
                  getInsertionLotDisplayLabel={getInsertionLotDisplayLabel}
                  showCompartmenting={showCompartmenting}
                  showConditionalColumns={showConditionalColumns}
                  showCalculatedColumns={showCalculatedColumns}
                  showColumnRename={showColumnRename}
                  filterInvolvedAttributeIds={globalFilterInvolvedAttributeIds}
                  sortInvolvedAttributeIds={globalSortInvolvedAttributeIds}
                  displayAsColumnsAttributeId={displayAsColumnsAttributeId}
                />
              </div>

            </div>

            <div className="flex w-5/12 flex-col border-l bg-gray-50">
              <div className="border-b px-4 py-4">
                <div className="text-lg font-semibold text-gray-900">
                  Filtrage / Tri / Groupe
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-3">
                  {/* Sélecteur de date pour chooseOne / choosePeriod */}
                  {(mainObjectDefinition?.defaultDateFiltering === 'chooseOne'
                    || mainObjectDefinition?.defaultDateFiltering === 'choosePeriod'
                    || (typeof mainObjectDefinition?.defaultDateFiltering === 'object' && mainObjectDefinition.defaultDateFiltering !== null)) && (
                    <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                      {mainObjectDefinition.defaultDateFiltering === 'chooseOne' ? (
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium">Rapport le</span>
                            <input
                              type="date"
                              value={reportChosenDate}
                              onChange={(e) => {
                                setReportChosenDate(e.target.value);
                                if (mainObject) {
                                  const ctx = { ...reportTemporalContext, chosenDate: e.target.value };
                                  applyMainObjectDefaultDateFiltering(
                                    mainObject.themeId, mainObject.objectId,
                                    getMainObjectAvailableAttributes(),
                                    mainObjectDefinition.defaultDateFiltering,
                                    ctx,
                                    { start: mainObjectDefinition.applicationDateConfig?.startAttributeId, end: mainObjectDefinition.applicationDateConfig?.endAttributeId }
                                  );
                                }
                              }}
                              className="rounded border border-blue-300 bg-white px-2 py-1 text-xs"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {getQuickDatePresets().map(({ label, end }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => {
                                  setReportChosenDate(end);
                                  if (mainObject) {
                                    applyMainObjectDefaultDateFiltering(
                                      mainObject.themeId, mainObject.objectId,
                                      getMainObjectAvailableAttributes(),
                                      mainObjectDefinition.defaultDateFiltering,
                                      { ...reportTemporalContext, chosenDate: end },
                                      { start: mainObjectDefinition.applicationDateConfig?.startAttributeId, end: mainObjectDefinition.applicationDateConfig?.endAttributeId }
                                    );
                                  }
                                }}
                                className="rounded border border-blue-300 bg-white px-1.5 py-0.5 text-[10px] text-blue-800 hover:bg-blue-100"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium">Rapport entre</span>
                            <input
                              type="date"
                              value={reportChosenPeriodStart}
                              onChange={(e) => {
                                setReportChosenPeriodStart(e.target.value);
                                if (mainObject) {
                                  const ctx = { ...reportTemporalContext, chosenPeriodStart: e.target.value, chosenPeriodEnd: reportChosenPeriodEnd };
                                  applyMainObjectDefaultDateFiltering(
                                    mainObject.themeId, mainObject.objectId,
                                    getMainObjectAvailableAttributes(),
                                    mainObjectDefinition.defaultDateFiltering,
                                    ctx,
                                    { start: mainObjectDefinition.applicationDateConfig?.startAttributeId, end: mainObjectDefinition.applicationDateConfig?.endAttributeId }
                                  );
                                }
                              }}
                              className="rounded border border-blue-300 bg-white px-2 py-1 text-xs"
                            />
                            <span className="font-medium">et</span>
                            <input
                              type="date"
                              value={reportChosenPeriodEnd}
                              onChange={(e) => {
                                setReportChosenPeriodEnd(e.target.value);
                                if (mainObject) {
                                  const ctx = { ...reportTemporalContext, chosenPeriodStart: reportChosenPeriodStart, chosenPeriodEnd: e.target.value };
                                  applyMainObjectDefaultDateFiltering(
                                    mainObject.themeId, mainObject.objectId,
                                    getMainObjectAvailableAttributes(),
                                    mainObjectDefinition.defaultDateFiltering,
                                    ctx,
                                    { start: mainObjectDefinition.applicationDateConfig?.startAttributeId, end: mainObjectDefinition.applicationDateConfig?.endAttributeId }
                                  );
                                }
                              }}
                              className="rounded border border-blue-300 bg-white px-2 py-1 text-xs"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {getQuickDatePresets().map(({ label, start, end }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => {
                                  setReportChosenPeriodStart(start);
                                  setReportChosenPeriodEnd(end);
                                  if (mainObject) {
                                    applyMainObjectDefaultDateFiltering(
                                      mainObject.themeId, mainObject.objectId,
                                      getMainObjectAvailableAttributes(),
                                      mainObjectDefinition.defaultDateFiltering,
                                      { ...reportTemporalContext, chosenPeriodStart: start, chosenPeriodEnd: end },
                                      { start: mainObjectDefinition.applicationDateConfig?.startAttributeId, end: mainObjectDefinition.applicationDateConfig?.endAttributeId }
                                    );
                                  }
                                }}
                                className="rounded border border-blue-300 bg-white px-1.5 py-0.5 text-[10px] text-blue-800 hover:bg-blue-100"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {mainObjectLinkedToCollaborateur && (
                    <div className="rounded border border-teal-200 bg-teal-50 p-2 text-xs text-teal-900">
                      <div className="mb-1 flex flex-wrap items-start gap-2">
                        <button
                          type="button"
                          onClick={() => setCollaboratorContextExpanded((previous) => !previous)}
                          className="flex min-w-[220px] flex-1 flex-col rounded px-1 py-0.5 text-left text-[11px] font-medium leading-none text-teal-800 hover:bg-teal-100"
                          aria-expanded={collaboratorContextExpanded}
                          title={collaboratorContextExpanded ? 'Replier les filtres collaborateurs' : 'Déplier les filtres collaborateurs'}
                        >
                          <span>{collaboratorContextExpanded ? '▾ ' : '▸ '}Cibler des contrats et postes</span>
                          <span className="mt-1 truncate text-[10px] font-normal text-teal-700">{collaboratorHeaderSummaryLabel}</span>
                        </button>

                        <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
                          <select
                            value={collaboratorContractDateMode}
                            onChange={(event) => setCollaboratorContractDateMode(event.target.value as CollaboratorContractDateMode)}
                            disabled={!isContractPosteTargetSelectorEnabled}
                            className="min-w-[210px] flex-1 rounded border border-teal-300 bg-white px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                            title={
                              isContractPosteTargetSelectorEnabled
                                ? 'Sélectionner la date cible pour contrat et poste'
                                : "Activez d'abord un filtre collaborateur ou sélectionnez une instance applicable"
                            }
                          >
                            <option value="today">date du jour</option>
                            {isReportInDayMode ? (
                              <option value="reportEnd">date du rapport</option>
                            ) : (
                              <>
                                <option value="reportStart">Date de début du rapport</option>
                                <option value="reportEnd">Date de fin du rapport</option>
                                <option value="reportColumn">colonne du rapport</option>
                              </>
                            )}
                          </select>

                          {!isReportInDayMode && collaboratorContractDateMode === 'reportColumn' && (
                            <select
                              value={selectedCollaboratorContractDateColumnId}
                              onChange={(event) => setSelectedCollaboratorContractDateColumnId(event.target.value)}
                              disabled={!isContractPosteTargetSelectorEnabled}
                              className="min-w-[210px] flex-1 rounded border border-teal-300 bg-white px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                            >
                              {reportDateColumnOptions.length === 0 && (
                                <option value="">Aucune colonne date disponible</option>
                              )}
                              {reportDateColumnOptionGroups.map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                  {group.items.map((attr) => (
                                    <option key={attr.id} value={attr.id}>{getSelectedAttributeOptionLabel(attr)}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          )}
                        </div>

                      </div>

                      {collaboratorContextExpanded && (
                        <>
                          <div className="mb-2">
                            <div>
                              <div className="mb-1 text-[11px] text-teal-800">Collaborateur concerné</div>
                              <select
                                value={selectedCollaboratorTarget}
                                onChange={(event) => setSelectedCollaboratorTarget(event.target.value)}
                                className="w-full rounded border border-teal-300 bg-white px-2 py-1.5 text-xs"
                              >
                                {collaboratorTargetOptions.map((option) => (
                                  <option key={option.key} value={option.label}>
                                    {option.label}{option.isMainCollaborator ? ' (par défaut)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="mb-2 grid gap-2 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-[11px] text-teal-800">Un collaborateur précis</div>
                              <select
                                value={selectedCollaboratorName}
                                onChange={(event) => handleCollaboratorNameChange(event.target.value)}
                                className="w-full rounded border border-teal-300 bg-white px-2 py-1.5 text-xs"
                              >
                                <option value="">Tous les collaborateurs</option>
                                {collaboratorOptions.map((collaborator) => (
                                  <option key={collaborator} value={collaborator}>{collaborator}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <div className="mb-1 text-[11px] text-teal-800">Manager du collaborateur</div>
                              <select
                                value={selectedManagerCollaboratorName}
                                onChange={(event) => handleManagerCollaboratorChange(event.target.value)}
                                className="w-full rounded border border-teal-300 bg-white px-2 py-1.5 text-xs"
                              >
                                <option value="">Tous les managers</option>
                                {collaboratorOptions.map((collaborator) => (
                                  <option key={`manager-${collaborator}`} value={collaborator}>{collaborator}</option>
                                ))}
                              </select>

                              <label className="mt-2 inline-flex items-center gap-2 text-[11px] text-teal-800">
                                <input
                                  type="checkbox"
                                  checked={includeManagerDescendants}
                                  onChange={(event) => setIncludeManagerDescendants(event.target.checked)}
                                />
                                <span>avec descendance managériale</span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 grid gap-2 md:grid-cols-2">
                              {contractTypeEnumValues.length > 0 && (
                                <div>
                                  <div className="mb-1 text-[11px] text-teal-800">Type du contrat</div>
                                  <div className="max-h-20 overflow-auto rounded border border-teal-200 bg-white p-2 text-[10px] font-light">
                                    {contractTypeEnumValues.map((contractType) => (
                                      <label key={contractType} className="flex items-center gap-2 whitespace-nowrap font-light">
                                        <input
                                          type="checkbox"
                                          checked={selectedContractTypeFilters.includes(contractType)}
                                          onChange={(event) => {
                                            const checked = event.target.checked;
                                            setSelectedCollaboratorName('');
                                            setSelectedContractTypeFilters((prev) => {
                                              const next = new Set(prev);
                                              if (checked) next.add(contractType);
                                              else next.delete(contractType);
                                              return Array.from(next).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
                                            });
                                          }}
                                        />
                                        <span className="font-light">{contractType}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <div className="mb-1 text-[11px] text-teal-800">Qualification du poste</div>
                                <div className="max-h-20 overflow-auto rounded border border-teal-200 bg-white p-2 text-[10px] font-light">
                                  {qualificationTree.length === 0 ? (
                                    <div className="text-gray-500">Aucune qualification chargée.</div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {qualificationTree.map((rootNode) => (
                                        <DepartmentTreeItem
                                          key={`qualification-${rootNode.name}`}
                                          node={rootNode}
                                          level={0}
                                          disabled={false}
                                          selectedValues={selectedQualificationFilters}
                                          onToggle={toggleQualificationBranch}
                                          path="qualification"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mb-2 grid gap-2 md:grid-cols-2">
                              <div>
                                <div className="mb-1 text-[11px] text-teal-800">Département du poste</div>
                                <div className="h-24 overflow-auto rounded border border-teal-200 bg-white p-2 text-[10px] font-light">
                                  {departmentTree.length === 0 ? (
                                    <div className="text-gray-500">Aucun département chargé.</div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {departmentTree.map((rootNode) => (
                                        <DepartmentTreeItem
                                          key={rootNode.name}
                                          node={rootNode}
                                          level={0}
                                          disabled={false}
                                          selectedValues={selectedDepartmentFilters}
                                          onToggle={toggleDepartmentBranch}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="mb-1 text-[11px] text-teal-800">Etablissement du poste</div>
                                <div className="h-24 overflow-auto rounded border border-teal-200 bg-white p-2 text-[10px] font-light">
                                  {establishmentOptions.map((establishment) => (
                                    <label key={establishment} className="flex items-center gap-2 whitespace-nowrap font-light">
                                      <input
                                        type="checkbox"
                                        checked={selectedEstablishmentFilters.includes(establishment)}
                                        onChange={(event) => {
                                          const checked = event.target.checked;
                                          setSelectedCollaboratorName('');
                                          setSelectedEstablishmentFilters((prev) => {
                                            const next = new Set(prev);
                                            if (checked) next.add(establishment);
                                            else next.delete(establishment);
                                            return Array.from(next).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
                                          });
                                        }}
                                      />
                                      <span className="font-light">{establishment}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>

                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="rounded border border-gray-200 bg-white p-2 text-xs text-gray-800">
                    <div className="mb-1 text-[11px] font-medium leading-none text-gray-700">Filtrer les colonnes du rapport</div>
                    <button
                      onClick={() => setGlobalFilterDialogOpen(true)}
                      className="w-full rounded border border-orange-200 bg-orange-50 p-2 text-left text-xs text-orange-800 hover:bg-orange-100"
                      title={globalFilterGroups && globalFilterGroups.length > 0 ? 'Modifier le filtrage global' : 'Configurer le filtrage global'}
                    >
                      {globalFilterGroups && globalFilterGroups.length > 0 ? (
                        <>
                          <div className="mb-1 font-normal">Filtres actifs :</div>
                          <div className="space-y-1 font-normal">
                            {getGlobalFilterGroupLines().map((line, index) => (
                              <div key={index}>
                                {index > 0 && <div className="my-1 font-normal text-orange-900">OU</div>}
                                <div className="ml-2 font-normal">{line}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <span>Aucun filtre global défini</span>
                      )}
                    </button>
                  </div>

                  <div className="rounded border border-gray-200 bg-white p-2 text-xs text-gray-800">
                    <div className="mb-2 flex flex-col items-start gap-2">
                      <div className="text-[11px] font-medium leading-none text-gray-700">Tri</div>
                      <select
                        value={pendingSortColumnId}
                        onChange={(event) => handleSortColumnSelect(event.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                      >
                        <option value="">Sélectionner une colonne</option>
                        {availableSortPickerGroups.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.items.map((attr) => (
                              <option key={attr.id} value={attr.id}>
                                {getSelectedAttributeOptionLabel(attr)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {sortColumnIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sortColumnIds.map((id, index) => {
                          const attr = sortableById.get(id);
                          if (!attr) return null;

                          return (
                            <div
                              key={id}
                              draggable
                              onDragStart={() => handleSortDragStart(id)}
                              onDragOver={(event) => handleSortDragOver(event, id)}
                              onDrop={() => handleSortDrop(id)}
                              onDragEnd={handleSortDragEnd}
                              className={`flex cursor-grab items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 ${dragOverSortColumnId === id ? 'ring-2 ring-blue-300' : ''}`}
                              title="Glissez-déposez pour changer la priorité"
                            >
                              <span className="text-[11px] font-medium text-blue-800">
                                {index + 1}. {getSelectedAttributeDisplayName(attr)}
                              </span>
                              <button
                                onClick={() => removeSortColumn(id)}
                                className="rounded px-1 text-[11px] text-red-600 hover:bg-red-50"
                                title="Retirer cette colonne du tri"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded border border-gray-200 bg-white p-2 text-xs text-gray-800">
                    <div className="mb-2 flex flex-col items-start gap-2">
                      <div className="text-[11px] font-medium leading-none text-gray-700">Grouper les lignes</div>
                      <select
                        value={pendingGroupColumnId}
                        onChange={(event) => handleGroupColumnSelect(event.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                      >
                        <option value="">Sélectionner une colonne</option>
                        {availableGroupPickerGroups.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.items.map((attr) => (
                              <option key={attr.id} value={attr.id}>
                                {getSelectedAttributeOptionLabel(attr)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {groupedColumnIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {groupedColumnIds.map((id, index) => {
                          const attr = groupableById.get(id);
                          if (!attr) return null;

                          return (
                            <div key={id} className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1">
                              <span className="text-[11px] font-medium text-emerald-800">
                                {index + 1}: {getSelectedAttributeDisplayName(attr)}
                              </span>
                              <button
                                onClick={() => removeGroupedColumn(id)}
                                className="rounded px-1 text-[11px] text-red-600 hover:bg-red-50"
                                title="Retirer cette colonne des groupes"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {showDisplayAsColumns && (
                    <div className="rounded border border-gray-200 bg-white p-2 text-xs text-gray-800">
                      <div className="mb-2 flex flex-col items-start gap-2">
                        <div className="text-[11px] font-medium leading-none text-gray-700">Afficher en colonnes</div>
                        <select
                          value={displayAsColumnsAttributeId}
                          onChange={(event) => handleDisplayAsColumnsSelect(event.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                        >
                          <option value="">Aucune colonne dynamique</option>
                          {displayAsColumnsPickers.map((attr) => (
                            <option key={attr.id} value={attr.id}>
                              {getSelectedAttributeDisplayName(attr)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      {pendingObjectInsertion && (
        <ObjectInsertionDialog
          isOpen={objectInsertionDialogOpen}
          onClose={() => {
            setObjectInsertionDialogOpen(false);
            setPendingObjectInsertion(null);
            setEditingAggregationAttributeId(null);
            setEditingOperationGroupKey(null);
            if (selectingMainObject) {
              setPendingMainObject(null);
            }
          }}
          objectName={pendingObjectInsertion.objectName}
          cardinality={pendingObjectInsertion.cardinality}
          objectSupportsApplicable={!!pendingObjectInsertion.isApplicable}
          objectApplicationDateMandatory={!!pendingObjectInsertion.applicationDateMandatory}
          objectApplicationDateRequirementMode={pendingObjectInsertion.applicationDateRequirementMode ?? 'day'}
          availableAttributes={getInsertionAvailableAttributes(pendingObjectInsertion)}
          smartObjects={pendingObjectInsertion.smartObjects}
          availableDateAttributes={getAvailableDateAttributes().map((attr) => ({
            id: attr.id,
            name: attr.columnName || `${attr.attributeName} (${attr.objectName})`,
          }))}
          isCollaboratorMultiTile={!!pendingObjectInsertion.collaboratorMultiTile}
          initialMode={pendingObjectInsertion.mode}
          initialConfig={
            editingAggregationAttributeId
              ? (() => {
                  const edited = selectedAttributes.find((a) => a.id === editingAggregationAttributeId);
                  if (!edited || !['first', 'last', 'aggregation'].includes(edited.insertionType)) return undefined;
                  const selectedAttributeIds = editingOperationGroupKey
                    ? selectedAttributes
                        .filter((candidate) => getObjectInstanceKey(candidate) === editingOperationGroupKey)
                        .map((candidate) => candidate.attributeId)
                    : [edited.attributeId];

                  return {
                    insertionType: edited.insertionType as Extract<InsertionType, 'first' | 'last' | 'aggregation'>,
                    selectedAttributeIds,
                    aggregationAttributeId: edited.insertionType === 'aggregation' ? edited.attributeId : undefined,
                    aggregationType: edited.aggregationType,
                    sortAttributeId: edited.sortAttributeId,
                    sortDirection: edited.sortDirection,
                  };
                })()
              : pendingObjectInsertion.initialConfig
          }
          onConfirm={handleObjectInsertionConfirm}
        />
      )}

      {contractPosteLotAttributesDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-900">
              {editingInsertionLotId ? getInsertionLotDisplayLabel(editingInsertionLotId) : 'Éditer le lot'}
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Ajoutez ou retirez les attributs du contrat, du poste et des objets liés en cardinalité simple pour ce lot uniquement.
            </p>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-2">
              {contractPosteLotAttributeCatalog.sections.map((section) => (
                <div key={section.key} className="rounded border border-gray-200 p-3">
                  <div className="mb-2 text-sm font-medium text-gray-900">{section.label}</div>
                  <div className="space-y-1 text-sm text-gray-800">
                    {section.attributes.map((attr) => {
                      const attributeKey = getContractPosteLotAttributeKey(attr.sourceThemeId, attr.sourceObjectId, attr.id, attr.lotBaseNavigationPath);
                      const checked = draftLotAttributeKeys.includes(attributeKey);
                      return (
                        <label key={attributeKey} className="flex items-start gap-2 rounded px-2 py-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const nextChecked = event.target.checked;
                              setDraftLotAttributeKeys((prev) => {
                                const next = new Set(prev);
                                if (nextChecked) {
                                  next.add(attributeKey);
                                } else {
                                  next.delete(attributeKey);
                                }
                                return Array.from(next);
                              });
                            }}
                          />
                          <span>{attr.rawName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setContractPosteLotAttributesDialogOpen(false);
                  setEditingInsertionLotId(null);
                  setDraftLotAttributeKeys([]);
                }}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleContractPosteLotAttributesConfirm}
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {contractPosteLotDateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              {editingInsertionLotId
                ? `Date de ciblage - ${getInsertionLotDisplayLabel(editingInsertionLotId)}`
                : 'Date de ciblage du lot contrat/poste'}
            </h3>
            <div className="space-y-3 text-sm text-gray-800">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="lot-date-mode"
                  value="today"
                  checked={draftLotDateMode === 'today'}
                  onChange={() => setDraftLotDateMode('today')}
                />
                <span>Date du jour</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="lot-date-mode"
                  value="reportStart"
                  checked={draftLotDateMode === 'reportStart'}
                  onChange={() => setDraftLotDateMode('reportStart')}
                />
                <span>Début du rapport</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="lot-date-mode"
                  value="reportEnd"
                  checked={draftLotDateMode === 'reportEnd'}
                  onChange={() => setDraftLotDateMode('reportEnd')}
                />
                <span>Fin du rapport</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="lot-date-mode"
                  value="reportColumn"
                  checked={draftLotDateMode === 'reportColumn'}
                  onChange={() => {
                    setDraftLotDateMode('reportColumn');
                    if (!draftLotDateColumnId) {
                      setDraftLotDateColumnId(reportDateColumnOptions[0]?.id ?? '');
                    }
                  }}
                />
                <span>Colonne date du rapport</span>
              </label>

              {draftLotDateMode === 'reportColumn' && (
                <select
                  value={draftLotDateColumnId}
                  onChange={(event) => setDraftLotDateColumnId(event.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                >
                  {reportDateColumnOptions.length === 0 && <option value="">Aucune colonne date disponible</option>}
                  {reportDateColumnOptionGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((attr) => (
                        <option key={attr.id} value={attr.id}>{getSelectedAttributeOptionLabel(attr)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setContractPosteLotDateDialogOpen(false);
                  setEditingInsertionLotId(null);
                }}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleContractPosteLotDateConfirm}
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAttribute && (
        <>
          <CompartmentDialog
            isOpen={compartmentDialogOpen}
            onClose={() => {
              setCompartmentDialogOpen(false);
              setEditingAttributeId(null);
            }}
            attributeName={editingAttribute.attributeName}
            attributeType={editingAttribute.attributeType}
            currentCompartmentConfig={editingAttribute.compartmentConfig}
            onConfirm={handleCompartmentConfirm}
            selectedDateAttributes={editingAttribute.attributeType === 'date' ? getSelectedDateAttributesForFilter(editingAttribute.id) : undefined}
          />

          {editingAttribute.isApplicable && (
            <DateReferenceDialog
              isOpen={dateReferenceDialogOpen}
              onClose={() => {
                setDateReferenceDialogOpen(false);
                setEditingAttributeId(null);
              }}
              objectName={editingAttribute.objectName}
              currentDateReference={editingAttribute.dateReference}
              availableDateAttributes={getAvailableDateAttributes()}
              forceReportValueDateOnly={editingAttribute.applicationDateConfig?.requirementMode === 'period'}
              onConfirm={handleDateReferenceConfirm}
            />
          )}

          <ConditionalColumnDialog
            isOpen={conditionalColumnDialogOpen}
            onClose={() => {
              setConditionalColumnDialogOpen(false);
              setEditingAttributeId(null);
            }}
            availableColumns={getAvailableColumnsForConditional()}
            currentConfig={editingAttribute?.conditionalConfig}
            onConfirm={handleConditionalColumnConfirm}
          />

          <CalculatedColumnDialog
            isOpen={calculatedColumnDialogOpen}
            onClose={() => {
              setCalculatedColumnDialogOpen(false);
              setEditingAttributeId(null);
            }}
            availableColumns={getAvailableColumnsForCalculated()}
            currentConfig={editingAttribute?.calculatedConfig}
            onConfirm={handleCalculatedColumnConfirm}
          />
        </>
      )}

      {/* Dialog pour créer une colonne conditionnelle (sans editingAttribute) */}
      {!editingAttribute && (
        <ConditionalColumnDialog
          isOpen={conditionalColumnDialogOpen}
          onClose={() => setConditionalColumnDialogOpen(false)}
          availableColumns={getAvailableColumnsForConditional()}
          onConfirm={handleConditionalColumnConfirm}
        />
      )}

      {/* Dialog pour créer une colonne calculée (sans editingAttribute) */}
      {!editingAttribute && (
        <CalculatedColumnDialog
          isOpen={calculatedColumnDialogOpen}
          onClose={() => setCalculatedColumnDialogOpen(false)}
          availableColumns={getAvailableColumnsForCalculated()}
          onConfirm={handleCalculatedColumnConfirm}
        />
      )}

      <FilterDialog
        isOpen={globalFilterDialogOpen}
        onClose={() => setGlobalFilterDialogOpen(false)}
        attributeName="Filtrage global"
        attributeType="string"
        currentFilterGroups={globalFilterGroups}
        onConfirm={handleGlobalFilterConfirm}
        objectAttributes={getGlobalFilterObjectAttributes()}
        selectedFilterAttributes={getGlobalSelectedAttributesForFilter()}
        compartmentFilterAttributes={getGlobalCompartmentFilterAttributes()}
        showCompartmenting={showCompartmenting}
      />

      {!reportResultOpen && !selectingMainObject && (
        <div className="border-t bg-white">
          <div className="flex">
            <div className="w-1/2 px-4 py-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={openPrototypeConfig}
                  className="rounded border border-dashed border-gray-400 px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  conf proto
                </button>
                {bottomLeftActions}
              </div>
            </div>
            <div className="w-1/2 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">
                    {selectedAttributes.length} champ{selectedAttributes.length !== 1 ? 's' : ''} dans le rapport
                  </div>
                  {showConditionalColumns && (
                    <button
                      onClick={handleCreateConditionalColumn}
                      className="rounded border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-100"
                      title="Créer une colonne conditionnelle qui évalue des expressions logiques"
                    >
                      + Colonne conditionnelle
                    </button>
                  )}
                  {showCalculatedColumns && (
                    <button
                      onClick={handleCreateCalculatedColumn}
                      className="rounded border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-100"
                      title="Créer une colonne calculée avec des opérations mathématiques ou logiques"
                    >
                      + Colonne calculée
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    onClick={() => {
                      const refreshed = refreshReportPreview();
                      if (!refreshed) {
                        return;
                      }
                      onReportGenerated?.({
                        title: `Rapport ${reportDisplayName}`,
                        domain: mainObject?.themeName,
                        mainObjectName: reportDisplayName,
                      });
                      setReportResultOpen(true);
                      console.log('Report payload:', {
                        selectedAttributes,
                        groupedColumnIds,
                        sortColumnIds,
                        globalFilterGroups,
                        temporalContext: {
                          mode: mainObjectTemporalMode,
                          reportDate,
                          periodStartDate: reportPeriodStartDate,
                          periodEndDate: reportPeriodEndDate,
                          chosenDate: reportChosenDate,
                          chosenPeriodStart: reportChosenPeriodStart,
                          chosenPeriodEnd: reportChosenPeriodEnd,
                        },
                        collaboratorStatusFilter: {
                          enabled: mainObjectLinkedToCollaborateur,
                          reportDate: collaboratorStatusReferenceDate,
                          includeDepartedCollaborators,
                          includePresentCollaborators,
                          includeFutureNewCollaborators,
                          includeFutureReturnCollaborators,
                          selectedCollaboratorName,
                          selectedManagerCollaboratorName,
                          includeManagerDescendants,
                          selectedContractTypeFilters,
                          selectedQualificationFilters,
                          selectedDepartmentFilters,
                          selectedEstablishmentFilters,
                          generatedLines: mainObjectLinkedToCollaborateur ? collaboratorGeneratedFilterLines : [],
                        },
                      });
                    }}
                  >
                    Générer le rapport
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {prototypeConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Configuration prototype</h3>

            <div className="space-y-3">
              {[
                {
                  label: 'Compartimentage',
                  enabled: draftShowCompartmenting,
                  setEnabled: setDraftShowCompartmenting,
                },
                {
                  label: 'Colonne conditionnelle',
                  enabled: draftShowConditionalColumns,
                  setEnabled: setDraftShowConditionalColumns,
                },
                {
                  label: 'Colonne calculée',
                  enabled: draftShowCalculatedColumns,
                  setEnabled: setDraftShowCalculatedColumns,
                },
                {
                  label: 'Renommage colonnes',
                  enabled: draftShowColumnRename,
                  setEnabled: setDraftShowColumnRename,
                },
                {
                  label: 'Afficher en colonnes',
                  enabled: draftShowDisplayAsColumns,
                  setEnabled: setDraftShowDisplayAsColumns,
                },
                {
                  label: 'Afficher les cardinalités',
                  enabled: draftShowLinkedObjectCardinalities,
                  setEnabled: setDraftShowLinkedObjectCardinalities,
                },
                {
                  label: 'Bouton "autre cardinalités"',
                  enabled: draftShowOtherCardinalitiesButton,
                  setEnabled: setDraftShowOtherCardinalitiesButton,
                },
                {
                  label: 'Bouton débug "Tout (dé)sélectionner"',
                  enabled: draftShowSelectAllButton,
                  setEnabled: setDraftShowSelectAllButton,
                },
              ].map((toggle) => (
                <div key={toggle.label} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
                  <span className="text-sm text-gray-800">{toggle.label}</span>
                  <div className="flex items-center gap-1 rounded bg-gray-100 p-0.5">
                    <button
                      onClick={() => toggle.setEnabled(true)}
                      className={`rounded px-2 py-1 text-xs ${toggle.enabled ? 'bg-green-600 font-medium text-white shadow-sm' : 'text-green-700 hover:bg-green-50'}`}
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => toggle.setEnabled(false)}
                      className={`rounded px-2 py-1 text-xs ${!toggle.enabled ? 'bg-red-600 font-medium text-white shadow-sm' : 'text-red-700 hover:bg-red-50'}`}
                    >
                      Non
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPrototypeConfigOpen(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={applyPrototypeConfig}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {linkedMultiCardinalityDialogGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Objets liés via cardinalité multiple</h3>
                <p className="text-sm text-gray-600">{linkedMultiCardinalityDialogGroup.objectName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLinkedMultiCardinalityDialogGroup(null);
                  setLinkedMultiCardinalityInsertionTarget(null);
                }}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                Fermer
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3">
              {linkedMultiCardinalityDialogObjects.length > 0 ? (
                <div className="space-y-2 text-sm text-gray-800">
                  {linkedMultiCardinalityDialogObjects.map((linkedObject) => (
                    <div key={linkedObject.key} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1.5">
                      <span>{linkedObject.objectName}</span>
                      {linkedObject.canInsert ? (
                        <button
                          type="button"
                          onClick={() => setLinkedMultiCardinalityInsertionTarget(linkedObject)}
                          className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                        >
                          Insérer
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-500">Insertion indisponible</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Aucun objet lié en cardinalité multiple.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {linkedMultiCardinalityInsertionTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Mode d'insertion</h3>
                <p className="text-sm text-gray-600">{linkedMultiCardinalityInsertionTarget.objectName}</p>
              </div>
              <button
                type="button"
                onClick={() => setLinkedMultiCardinalityInsertionTarget(null)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-2">
              {linkedMultiCardinalityInsertionTarget.linkedDateFilterMode === 'day' ? (
                <button
                  type="button"
                  onClick={() => openLinkedMultiCardinalityInsertion(linkedMultiCardinalityInsertionTarget, 'reportDate')}
                  className="w-full rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-left text-sm text-indigo-800 hover:bg-indigo-100"
                >
                  <div className="font-medium">Insérer la version à la Date de valeur du rapport</div>
                  <div className="text-xs text-indigo-700">La sélection d'instance est automatiquement basée sur dateRapport.</div>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openLinkedMultiCardinalityInsertion(linkedMultiCardinalityInsertionTarget, 'selection')}
                    className="w-full rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-left text-sm text-indigo-800 hover:bg-indigo-100"
                  >
                    <div className="font-medium">Sélection d'une instance</div>
                    <div className="text-xs text-indigo-700">Choisir le tri (ascendant/descendant) puis les attributs à insérer.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openLinkedMultiCardinalityInsertion(linkedMultiCardinalityInsertionTarget, 'operation')}
                    className="w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-100"
                  >
                    <div className="font-medium">Opération sur les instances</div>
                    <div className="text-xs text-amber-700">Choisir un attribut et une opération (count, sum, min, max, concat, avg).</div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}