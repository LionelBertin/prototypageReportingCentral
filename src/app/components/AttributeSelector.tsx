import { useEffect, useState } from 'react';
import { SelectionPanel } from './SelectionPanel';
import MainObjectPicker from './MainObjectPicker';
import { ObjectInsertionDialog, ObjectInsertionConfig } from './ObjectInsertionDialog';
import { FilterDialog } from './FilterDialog';
import { CompartmentDialog } from './CompartmentDialog';
import { ConditionalColumnDialog } from './ConditionalColumnDialog';
import { CalculatedColumnDialog } from './CalculatedColumnDialog';
import { DateReferenceDialog } from './DateReferenceDialog';
import { InfoHint } from './InfoHint';
import { SelectedAttribute, AggregationType, InsertionType, FilterGroup, CompartmentConfig, DateReference, ConditionalColumnConfig, CalculatedColumnConfig } from '../types/selection';
import { AttributeType, SmartObjectDefinition, dataStructure } from '../data/dataStructure';

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
  smartObjects?: SmartObjectDefinition[];
  navigationPath?: NavigationPath;
  directMagicOnly?: boolean;
  initialConfig?: Partial<ObjectInsertionConfig>;
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
  sourceThemeId: string;
  sourceThemeName: string;
  sourceObjectId: string;
  sourceObjectName: string;
  relativeNavigationPath: NavigationPath;
};

type Stage2ObjectGroup = {
  key: string;
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
  attributes: AvailableObjectAttribute[];
};

export function AttributeSelector() {
  const [selectedAttributes, setSelectedAttributes] = useState<SelectedAttribute[]>([]);
  const [selectingMainObject, setSelectingMainObject] = useState(true);
  const [mainObject, setMainObject] = useState<Omit<MainObjectSelection, 'cardinality' | 'isApplicable'> | null>(null);
  const [mainObjectConfig, setMainObjectConfig] = useState<ObjectInsertionConfig | null>(null);
  const [pendingMainObject, setPendingMainObject] = useState<MainObjectSelection | null>(null);
  const [objectInsertionDialogOpen, setObjectInsertionDialogOpen] = useState(false);
  const [pendingObjectInsertion, setPendingObjectInsertion] = useState<PendingObjectInsertion | null>(null);
  const [globalFilterDialogOpen, setGlobalFilterDialogOpen] = useState(false);
  const [globalFilterGroups, setGlobalFilterGroups] = useState<FilterGroup[] | undefined>(undefined);
  const [groupedColumnIds, setGroupedColumnIds] = useState<string[]>([]);
  const [pendingGroupColumnId, setPendingGroupColumnId] = useState<string>('');
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
  const [showCompartmenting, setShowCompartmenting] = useState(false);
  const [showConditionalColumns, setShowConditionalColumns] = useState(false);
  const [showCalculatedColumns, setShowCalculatedColumns] = useState(false);
  const [showColumnRename, setShowColumnRename] = useState(false);
  const [showLinkedObjectCardinalities, setShowLinkedObjectCardinalities] = useState(true);
  const [prototypeConfigOpen, setPrototypeConfigOpen] = useState(false);
  const [draftShowCompartmenting, setDraftShowCompartmenting] = useState(false);
  const [draftShowConditionalColumns, setDraftShowConditionalColumns] = useState(false);
  const [draftShowCalculatedColumns, setDraftShowCalculatedColumns] = useState(false);
  const [draftShowColumnRename, setDraftShowColumnRename] = useState(false);
  const [draftShowLinkedObjectCardinalities, setDraftShowLinkedObjectCardinalities] = useState(true);
  const [availableAttributeSearchTerm, setAvailableAttributeSearchTerm] = useState('');

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
    };
  };

  const getTodayIsoDate = () => {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
  };

  const isSingleRelationCardinality = (cardinality?: string) => {
    if (!cardinality) return true;
    return !cardinality.includes('n');
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
          ? (!!relation.magicSel || !!relation.recursiveMagicSel)
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
            ? (!!inboundRelation.magicSel || !!inboundRelation.recursiveMagicSel)
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
        sourceThemeId: theme.id,
        sourceThemeName: theme.name,
        sourceObjectId: obj.id,
        sourceObjectName: obj.name,
        relativeNavigationPath: [],
      }));
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
    const defaultAttributes = objectAttributes.filter((attr) => !!attr.autoSmartSel);
    const todayDate = getTodayIsoDate();
    const mainObjectSupportsApplicable = !!(obj.applicationDate || obj.isApplicable);
    const mainObjectApplicationDateMandatory = !!obj.applicationDateConfig?.mandatory;

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
          ? { type: 'custom', customDate: todayDate }
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
    setMainObjectConfig(
      mainObjectSupportsApplicable
        ? (mainObjectApplicationDateMandatory
          ? {
              insertionType: 'applicable',
              dateReference: { type: 'custom', customDate: todayDate },
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

    const availableAttributes = getObjectAttributes(mainObject.themeId, mainObject.objectId);
    const selectedAttributeIds = Array.from(
      new Set(
        smartObject.columns.flatMap((columnPath) => {
          const matched = availableAttributes.find((attribute) =>
            matchSmartPathToAttribute(attribute, columnPath)
          );
          return matched ? [matched.id] : [];
        })
      )
    );

    if (selectedAttributeIds.length === 0) {
      alert('Aucune colonne du preset n\'a pu être associée aux attributs disponibles.');
      return;
    }

    const todayDate = getTodayIsoDate();
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
            ? { type: 'custom', customDate: todayDate }
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

      const customDate = getTodayIsoDate();
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
            ? { type: 'custom', customDate }
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
      smartObjects: obj?.smartObjects,
      navigationPath,
      directMagicOnly: mode === 'aggregation',
    });
    setObjectInsertionDialogOpen(true);
  };

  const getInsertionAvailableAttributes = (pending: PendingObjectInsertion) => {
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

  const handleObjectInsertionConfirm = (config: ObjectInsertionConfig) => {
    if (!pendingObjectInsertion) return;

    if (editingAggregationAttributeId) {
      const objectAttributes = pendingObjectInsertion.directMagicOnly
        ? getDirectMagicAttributes(pendingObjectInsertion.themeId, pendingObjectInsertion.objectId)
        : getObjectAttributes(pendingObjectInsertion.themeId, pendingObjectInsertion.objectId);
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
        });

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

    const objectAttributes = pendingObjectInsertion.directMagicOnly
      ? getDirectMagicAttributes(pendingObjectInsertion.themeId, pendingObjectInsertion.objectId)
      : getObjectAttributes(pendingObjectInsertion.themeId, pendingObjectInsertion.objectId);

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
      });

      if (config.sortDirection) {
        newAttr.sortDirection = config.sortDirection;
      }

      if (isMainObjectSelection && pendingMainObject) {
        setMainObject({
          themeId: pendingMainObject.themeId,
          themeName: pendingMainObject.themeName,
          objectId: pendingMainObject.objectId,
          objectName: pendingMainObject.objectName,
        });
        setMainObjectConfig(config);
        setSelectingMainObject(false);
        setPendingMainObject(null);
        setSelectedAttributes([newAttr]);
      } else {
        setSelectedAttributes((prev) => appendUniqueAttributes(prev, [newAttr]));
      }

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
    const todayCustomDate = (() => {
      const now = new Date();
      return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
    })();

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
            ? (config.dateReference ?? (config.applyApplicableToday ? { type: 'custom', customDate: todayCustomDate } : undefined))
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
          });
        }
      );

    if (newAttributes.length > 0) {
      if (isMainObjectSelection && pendingMainObject) {
        setMainObject({
          themeId: pendingMainObject.themeId,
          themeName: pendingMainObject.themeName,
          objectId: pendingMainObject.objectId,
          objectName: pendingMainObject.objectName,
        });
        setMainObjectConfig(config);
        setSelectingMainObject(false);
        setPendingMainObject(null);
        setSelectedAttributes((prev) => appendUniqueAttributes(prev, newAttributes));
      } else {
        setSelectedAttributes((prev) => appendUniqueAttributes(prev, newAttributes));
      }
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
    setEditingAttributeId(id);
    setEditingObjectInstanceKey(currentAttr ? getObjectInstanceKey(currentAttr) : null);
    setDateReferenceDialogOpen(true);
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
      navigationPath: attr.navigationPath,
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
    if (!window.confirm('Changer le type du rapport ? Toutes les colonnes seront réinitialisées.')) {
      return;
    }

    setSelectedAttributes([]);
    setGlobalFilterGroups(undefined);
    setGlobalFilterDialogOpen(false);
    setGroupedColumnIds([]);
    setPendingGroupColumnId('');
    setSelectingMainObject(true);
    setMainObject(null);
    setMainObjectConfig(null);
    setPendingMainObject(null);
    setPendingObjectInsertion(null);
    setObjectInsertionDialogOpen(false);
    setSortColumnIds([]);
    setPendingSortColumnId('');
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
    setSortColumnIds([]);
    setPendingSortColumnId('');
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
    setPendingGroupColumnId((prev) => (prev && !selectedIds.has(prev) ? '' : prev));
    setSortColumnIds((prev) => prev.filter((id) => selectedIds.has(id) && !groupedIdSet.has(id)));
    setPendingSortColumnId((prev) => (prev && !selectedIds.has(prev) ? '' : prev));
  }, [selectedAttributes]);

  const openPrototypeConfig = () => {
    setDraftShowCompartmenting(showCompartmenting);
    setDraftShowConditionalColumns(showConditionalColumns);
    setDraftShowCalculatedColumns(showCalculatedColumns);
    setDraftShowColumnRename(showColumnRename);
    setDraftShowLinkedObjectCardinalities(showLinkedObjectCardinalities);
    setPrototypeConfigOpen(true);
  };

  const applyPrototypeConfig = () => {
    setShowCompartmenting(draftShowCompartmenting);
    setShowConditionalColumns(draftShowConditionalColumns);
    setShowCalculatedColumns(draftShowCalculatedColumns);
    setShowColumnRename(draftShowColumnRename);
    setShowLinkedObjectCardinalities(draftShowLinkedObjectCardinalities);
    setPrototypeConfigOpen(false);
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

    const lastPathItem = attr.navigationPath?.at(-1);
    if (lastPathItem) {
      const relationLabel = lastPathItem.relationLabel?.trim();
      const objectName = lastPathItem.objectName?.trim();
      if (relationLabel) return relationLabel;
      if (objectName) return objectName;
    }

    return attr.objectName;
  };

  const getSelectedAttributeDisplayName = (attr: SelectedAttribute) => {
    const baseName = attr.columnName || attr.attributeName;
    const groupTitle = getSelectedAttributeObjectGroupTitle(attr);

    if (!groupTitle) return baseName;
    return `${baseName} – ${groupTitle}`;
  };

  const getGlobalSelectedAttributesForFilter = () => {
    return selectedAttributes.map((attr) => ({
      id: attr.id,
      name: attr.attributeName,
      columnName: getSelectedAttributeDisplayName(attr),
      type: attr.attributeType,
    }));
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

    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return `${condition.attributeName} ${op}`;
    }

    if (condition.valueType === 'attribute' && condition.referenceAttributeName) {
      return `${condition.attributeName} ${op} ${condition.referenceAttributeName}`;
    }

    const renderedValue = Array.isArray(condition.value)
      ? `[${condition.value.join(', ')}]`
      : `"${condition.value}"`;

    return `${condition.attributeName} ${op} ${renderedValue}`;
  };

  const getGlobalFilterGroupLines = () => {
    if (!globalFilterGroups || globalFilterGroups.length === 0) return [] as string[];
    return globalFilterGroups.map((group) =>
      group.conditions.length > 1
        ? `(${group.conditions.map(getGlobalFilterConditionLabel).join(` ${group.logicalOperator} `)})`
        : group.conditions.map(getGlobalFilterConditionLabel).join(` ${group.logicalOperator} `)
    );
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
      branchVisited: Set<string>
    ) => {
      const currentKey = `${themeId}::${objectId}`;
      const found = objectByKey.get(currentKey as `${string}::${string}`);
      if (!found) return;

      groups.push({
        key: navigationPath.length === 0 ? currentKey : `${currentKey}::${getNavigationPathKey(navigationPath)}`,
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
      });

      if (!isSelectable) return;

      const nextVisited = new Set(branchVisited);
      nextVisited.add(currentKey);

      for (const relation of found.obj.relations ?? []) {
        if (!isSingleRelationCardinality(relation.cardinality)) continue;

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
          relation.cardinalityFrom ?? relation.cardinality,
          true,
          nextVisited
        );
      }

      for (const [sourceKey, sourceEntry] of objectByKey.entries()) {
        if (nextVisited.has(sourceKey)) continue;

        const inboundRelation = (sourceEntry.obj.relations ?? []).find(
          (relation) =>
            relation.targetThemeId === themeId
            && relation.targetObjectId === objectId
            && isSingleRelationCardinality(relation.cardinalityFrom)
        );

        if (!inboundRelation) continue;

        const childPath = [
          ...navigationPath,
          {
            objectName: sourceEntry.obj.name,
            cardinalityName: inboundRelation.cardinality,
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
          true,
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
    const todayDate = getTodayIsoDate();
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
          ? { type: 'custom', customDate: todayDate }
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

  const normalizeSearchText = (value: string) => value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const openStage2MultiObjectDialog = (
    group: Stage2ObjectGroup,
    preset: 'aggregation' | 'first' | 'last' | 'applicable'
  ) => {
    const theme = dataStructure.find((candidate) => candidate.id === group.themeId);
    const obj = theme?.objects.find((candidate) => candidate.id === group.objectId);
    if (!theme || !obj) return;

    const todayDate = getTodayIsoDate();
    const initialConfig = preset === 'aggregation'
      ? undefined
      : preset === 'applicable'
      ? {
          insertionType: 'applicable' as const,
          dateReference: { type: 'custom' as const, customDate: todayDate },
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
      mode: preset === 'aggregation' ? 'aggregation' : preset === 'applicable' ? 'special' : 'operation',
      isApplicable: group.objectSupportsApplicable,
      applicationDateMandatory: group.objectApplicationDateMandatory,
      smartObjects: obj.smartObjects,
      navigationPath: group.navigationPath,
      initialConfig,
    });
    setObjectInsertionDialogOpen(true);
  };

  const editingAttribute = selectedAttributes.find((attr) => attr.id === editingAttributeId);
  const mainObjectSmartObjects = selectingMainObject ? [] : getMainObjectSmartObjects();
  const mainObjectAvailableAttributes = selectingMainObject ? [] : getMainObjectAvailableAttributes();
  const mainObjectStage2Groups = selectingMainObject
    ? [] as Stage2ObjectGroup[]
    : getMainObjectStage2Groups(mainObjectAvailableAttributes);
  const mainObjectSelectedAttributeIds = selectingMainObject
    ? new Set<string>()
    : getMainObjectSelectedAttributeIds(mainObjectAvailableAttributes);
  const normalizedAvailableAttributeSearch = normalizeSearchText(availableAttributeSearchTerm.trim());
  const filteredMainObjectStage2Groups = normalizedAvailableAttributeSearch
    ? mainObjectStage2Groups
        .map((group) => {
          const groupNameMatches =
            normalizeSearchText(group.label).includes(normalizedAvailableAttributeSearch) ||
            normalizeSearchText(group.objectName).includes(normalizedAvailableAttributeSearch);

          if (groupNameMatches) return group;
          if (!group.isSelectable) return null;

          const filteredAttributes = group.attributes.filter((attr) =>
            normalizeSearchText(getMainObjectAttributeDisplayLabel(attr)).includes(normalizedAvailableAttributeSearch)
          );

          if (filteredAttributes.length === 0) return null;
          return { ...group, attributes: filteredAttributes };
        })
        .filter((group): group is Stage2ObjectGroup => group !== null)
    : mainObjectStage2Groups;
  const groupableSelectedAttributes = getGroupableSelectedAttributes();
  const groupableById = new Map(groupableSelectedAttributes.map((attr) => [attr.id, attr] as const));
  const availableGroupPickers = groupableSelectedAttributes.filter((attr) => !groupedColumnIds.includes(attr.id));
  const sortableSelectedAttributes = getSortableSelectedAttributes();
  const sortableById = new Map(sortableSelectedAttributes.map((attr) => [attr.id, attr] as const));
  const availableSortPickers = sortableSelectedAttributes.filter(
    (attr) => !sortColumnIds.includes(attr.id) && !groupedColumnIds.includes(attr.id)
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {selectingMainObject
              ? 'Quelle est la donnée principale du rapport ?'
              : mainObject
                ? `Rapport : ${mainObject.objectName}`
                : 'Rapport'}
          </h1>
          {!selectingMainObject && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleChangeReportType}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Changer le type de rapport
              </button>
              <button
                onClick={handleResetSelections}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Tout réinitialiser
              </button>
            </div>
          )}
        </div>
      </div>

      {!selectingMainObject && mainObjectSmartObjects.length > 0 && (
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
        {selectingMainObject ? (
          <div className="flex w-full justify-center overflow-y-auto">
            <div className="w-full max-w-[1200px]">
              <MainObjectPicker
                onSelect={handleMainObjectSelect}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="w-1/2">
              <div className="h-full overflow-y-auto border-r bg-gray-50">
                <div className="sticky top-0 z-10 border-b bg-gray-50 px-4 py-4">
                  <h2 className="font-semibold text-gray-900">Attributs disponibles</h2>
                  <div className="mt-3">
                    <input
                      type="text"
                      value={availableAttributeSearchTerm}
                      onChange={(event) => setAvailableAttributeSearchTerm(event.target.value)}
                      placeholder="Rechercher un attribut..."
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  {filteredMainObjectStage2Groups.map((group) => (
                    <div key={group.key} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                            <span>
                              {group.label !== group.objectName
                                ? `${group.label} (${group.objectName})`
                                : group.label}
                            </span>
                            <InfoHint text={group.tooltip} />
                          </h3>
                          {showLinkedObjectCardinalities && group.navigationPath.length > 0 && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                              {group.navigationPath.length === 1
                                ? group.navigationPath[0].sourceObjectName
                                : (group.navigationPath[0].relationLabel ?? group.navigationPath[0].sourceObjectName)
                              } · {group.cardinality}
                            </span>
                          )}
                        </div>
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
                        ) : (
                          <div className="text-xs text-gray-500">Relation multiple</div>
                        )}
                      </div>

                      {group.isSelectable ? (
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
                      ) : (
                        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <div className="mb-2">
                            {group.objectSupportsApplicable && group.objectApplicationDateMandatory
                              ? 'Cet objet est multi-instance. Une date est obligatoire, le choix par défaut est Applicable à la date du jour.'
                              : 'Cet objet est multi-instance. Choisissez un mode pour retomber sur une instance exploitable.'}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openStage2MultiObjectDialog(group, 'aggregation')}
                              className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
                            >
                              Opération
                            </button>
                            <button
                              onClick={() => openStage2MultiObjectDialog(group, 'first')}
                              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Première
                            </button>
                            <button
                              onClick={() => openStage2MultiObjectDialog(group, 'last')}
                              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Dernière
                            </button>
                            {group.objectSupportsApplicable && (
                              <button
                                onClick={() => openStage2MultiObjectDialog(group, 'applicable')}
                                className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-800 hover:bg-indigo-100"
                              >
                                Applicable (date du jour)
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredMainObjectStage2Groups.length === 0 && (
                    <div className="rounded border bg-white px-3 py-2 text-sm text-gray-500">
                      {normalizedAvailableAttributeSearch
                        ? 'Aucun attribut ne correspond à la recherche.'
                        : 'Aucun attribut disponible.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex w-1/2 flex-col border-l bg-white">
              <div className="border-b px-4 py-4">
                <div className="text-lg font-semibold text-gray-900">
                  Attributs sélectionnés
                </div>
              </div>

              <SelectionPanel
                selectedAttributes={selectedAttributes}
                groupedAttributeIds={groupedColumnIds}
                onRemoveAttribute={handleRemoveAttribute}
                onEditCompartment={handleEditCompartment}
                onEditDateReference={handleEditDateReference}
                onEditConditionalColumn={handleEditConditionalColumn}
                onEditCalculatedColumn={handleEditCalculatedColumn}
                onEditAggregation={handleEditAggregation}
                onReorder={handleReorder}
                onEditColumnName={handleEditColumnName}
                getDateAttributeName={getDateAttributeName}
                showCompartmenting={showCompartmenting}
                showConditionalColumns={showConditionalColumns}
                showCalculatedColumns={showCalculatedColumns}
                showColumnRename={showColumnRename}
                filterInvolvedAttributeIds={globalFilterInvolvedAttributeIds}
              />

              <div className="border-t bg-gray-50 px-4 py-3">
                <div className="space-y-3">
                  {globalFilterGroups && globalFilterGroups.length > 0 ? (
                    <>
                      <div className="text-sm font-medium text-gray-700">Filtrage</div>
                      <button
                        onClick={() => setGlobalFilterDialogOpen(true)}
                        className="w-full rounded border border-orange-200 bg-orange-50 p-2 text-left text-xs text-orange-800 hover:bg-orange-100"
                        title="Modifier le filtrage global"
                      >
                        <div className="mb-1 font-medium">Filtres actifs :</div>
                        <div className="space-y-1">
                          {getGlobalFilterGroupLines().map((line, index) => (
                            <div key={index}>
                              {index > 0 && <div className="my-1 font-bold text-orange-900">OU</div>}
                              <div className="ml-2">{line}</div>
                            </div>
                          ))}
                        </div>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-nowrap items-center gap-2">
                      <div className="shrink-0 text-sm font-medium text-gray-700">Filtrage</div>
                      <button
                        onClick={() => setGlobalFilterDialogOpen(true)}
                        className="min-w-0 flex-1 whitespace-nowrap rounded border border-orange-200 bg-orange-50 px-2 py-1.5 text-left text-xs text-orange-700 hover:bg-orange-100"
                        title="Configurer le filtrage global"
                      >
                        Aucun filtre global défini
                      </button>
                    </div>
                  )}

                  <div className="rounded border border-gray-200 bg-white p-2 text-xs text-gray-800">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-gray-700">Tri</div>
                      <select
                        value={pendingSortColumnId}
                        onChange={(event) => handleSortColumnSelect(event.target.value)}
                        className="min-w-[220px] rounded border border-gray-300 px-2 py-1.5 text-xs"
                      >
                        <option value="">Sélectionner une colonne</option>
                        {availableSortPickers.map((attr) => (
                          <option key={attr.id} value={attr.id}>
                            {getSelectedAttributeDisplayName(attr)}
                          </option>
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
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-gray-700">Grouper les lignes</div>
                      <select
                        value={pendingGroupColumnId}
                        onChange={(event) => handleGroupColumnSelect(event.target.value)}
                        className="min-w-[220px] rounded border border-gray-300 px-2 py-1.5 text-xs"
                      >
                        <option value="">Sélectionner une colonne</option>
                        {availableGroupPickers.map((attr) => (
                          <option key={attr.id} value={attr.id}>
                            {getSelectedAttributeDisplayName(attr)}
                          </option>
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
                                Groupe {index + 1}: {getSelectedAttributeDisplayName(attr)}
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
          availableAttributes={getInsertionAvailableAttributes(pendingObjectInsertion)}
          smartObjects={pendingObjectInsertion.smartObjects}
          availableDateAttributes={getAvailableDateAttributes().map((attr) => ({
            id: attr.id,
            name: attr.columnName || `${attr.attributeName} (${attr.objectName})`,
          }))}
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
        objectAttributes={selectedAttributes.map((attr) => ({
          id: attr.id,
          name: getSelectedAttributeDisplayName(attr),
          type: attr.attributeType,
        }))}
        selectedFilterAttributes={getGlobalSelectedAttributesForFilter()}
        compartmentFilterAttributes={getGlobalCompartmentFilterAttributes()}
        showCompartmenting={showCompartmenting}
      />

      {!selectingMainObject && (
        <div className="border-t bg-white">
          <div className="flex">
            <div className="w-1/2 px-4 py-4">
              <button
                onClick={openPrototypeConfig}
                className="rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                conf proto
              </button>
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
                      console.log('Selected attributes:', selectedAttributes);
                      alert('Configuration sauvegardée ! Voir la console pour les détails.');
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
                  label: 'Cardinalites objets lies',
                  enabled: draftShowLinkedObjectCardinalities,
                  setEnabled: setDraftShowLinkedObjectCardinalities,
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
    </div>
  );
}