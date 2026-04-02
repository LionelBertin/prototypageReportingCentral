import { useState } from 'react';
import { NavigationPanel } from './NavigationPanel';
import { SelectionPanel } from './SelectionPanel';
import MainObjectPicker from './MainObjectPicker';
import { ObjectInsertionDialog, ObjectInsertionConfig } from './ObjectInsertionDialog';
import { FilterDialog } from './FilterDialog';
import { CompartmentDialog } from './CompartmentDialog';
import { ConditionalColumnDialog } from './ConditionalColumnDialog';
import { CalculatedColumnDialog } from './CalculatedColumnDialog';
import { DateReferenceDialog } from './DateReferenceDialog';
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
  smartObjects?: SmartObjectDefinition[];
  navigationPath?: NavigationPath;
  directMagicOnly?: boolean;
};

type AvailableObjectAttribute = {
  id: string;
  name: string;
  rawName: string;
  type: AttributeType;
  magicSel?: boolean;
  smartSel?: boolean;
  sourceObjectSupportsApplicable: boolean;
  sourceThemeId: string;
  sourceThemeName: string;
  sourceObjectId: string;
  sourceObjectName: string;
  relativeNavigationPath: NavigationPath;
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
  const [showLinkedObjectCardinalities, setShowLinkedObjectCardinalities] = useState(false);
  const [prototypeConfigOpen, setPrototypeConfigOpen] = useState(false);
  const [draftShowCompartmenting, setDraftShowCompartmenting] = useState(false);
  const [draftShowConditionalColumns, setDraftShowConditionalColumns] = useState(false);
  const [draftShowCalculatedColumns, setDraftShowCalculatedColumns] = useState(false);
  const [draftShowColumnRename, setDraftShowColumnRename] = useState(false);
  const [draftShowLinkedObjectCardinalities, setDraftShowLinkedObjectCardinalities] = useState(false);

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
      dateReference: insertionType === 'applicable'
        ? (dateReference ?? { type: 'today' })
        : (effectiveApplicable ? { type: 'today' } : undefined),
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
    const visitedSmartByObject = new Map<string, boolean>();

    const collect = (
      currentThemeId: string,
      currentObjectId: string,
      relationPath: string[],
      relativeNavigationPath: NavigationPath,
      shouldSmartSelect: boolean
    ) => {
      const currentKey = `${currentThemeId}::${currentObjectId}`;
      const wasSmartVisited = visitedSmartByObject.get(currentKey);
      if (wasSmartVisited === true) return;
      if (wasSmartVisited === false && !shouldSmartSelect) return;

      const currentObject = objectByKey.get(currentKey);
      const currentTheme = themeById.get(currentThemeId);
      if (!currentObject) return;

      visitedSmartByObject.set(currentKey, shouldSmartSelect || wasSmartVisited === true);

      for (const attr of currentObject.attributes) {
        const compositeId = relationPath.length > 0
          ? `${currentKey}::${attr.id}`
          : attr.id;

        const existing = collectedById.get(compositeId);
        if (existing) {
          if (shouldSmartSelect && !!attr.magicSel && !existing.smartSel) {
            existing.smartSel = true;
          }
          continue;
        }

        const nextAttribute: AvailableObjectAttribute = {
          id: compositeId,
          name: relationPath.length > 0
            ? `${relationPath.join(' > ')} > ${attr.name}`
            : attr.name,
          rawName: attr.name,
          type: attr.type,
          magicSel: attr.magicSel,
          smartSel: shouldSmartSelect && !!attr.magicSel,
          sourceObjectSupportsApplicable: !!(currentObject.applicationDate || currentObject.isApplicable),
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
          !!relation.recursiveMagicSel
        );
      }
    };

    collect(themeId, objectId, [], [], true);

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
        type: attr.type,
        magicSel: attr.magicSel,
        smartSel: !!attr.magicSel,
        sourceObjectSupportsApplicable: !!(obj.applicationDate || obj.isApplicable),
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

    setPendingMainObject({
      themeId,
      themeName,
      objectId,
      objectName,
      cardinality: obj.cardinality,
      isApplicable: obj.applicationDate || obj.isApplicable,
    });

    setPendingObjectInsertion({
      themeId,
      themeName,
      objectId,
      objectName,
      cardinality: obj.cardinality,
      mode: 'detailed',
      isApplicable: obj.applicationDate || obj.isApplicable,
      smartObjects: obj.smartObjects,
    });
    setObjectInsertionDialogOpen(true);
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
            (config.insertionType === 'applicable' || config.applyApplicableToday)
            && attr.sourceObjectSupportsApplicable;

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
    setSelectingMainObject(true);
    setMainObject(null);
    setMainObjectConfig(null);
    setPendingMainObject(null);
    setPendingObjectInsertion(null);
    setObjectInsertionDialogOpen(false);
  };

  const handleResetSelections = () => {
    if (!window.confirm('Confirmer la réinitialisation de tous les attributs sélectionnés ?')) {
      return;
    }

    setSelectedAttributes([]);
  };

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

  const getGlobalSelectedAttributesForFilter = () => {
    return selectedAttributes.map((attr) => ({
      id: attr.id,
      name: attr.attributeName,
      columnName: attr.columnName || `${attr.attributeName} (${attr.objectName})`,
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

  const getGlobalFilterSummary = () => {
    if (!globalFilterGroups || globalFilterGroups.length === 0) {
      return 'Aucun filtre global défini';
    }
    const totalConditions = globalFilterGroups.reduce((sum, group) => sum + group.conditions.length, 0);
    return `${globalFilterGroups.length} groupe${globalFilterGroups.length > 1 ? 's' : ''} (${totalConditions} condition${totalConditions > 1 ? 's' : ''})`;
  };

  const getGlobalFilterConditionLabel = (condition: FilterGroup['conditions'][number]) => {
    const operatorLabels: Record<string, string> = {
      equals: '=',
      notEquals: '!=',
      greaterThan: '>',
      lessThan: '<',
      greaterOrEqual: '>=',
      lessOrEqual: '<=',
      contains: 'contient',
      startsWith: 'commence par',
      endsWith: 'termine par',
      isEmpty: 'vide',
      isNotEmpty: 'renseignée',
      in: 'in',
    };

    const op = operatorLabels[condition.operator] ?? condition.operator;

    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return `${condition.attributeName} ${op}`;
    }

    if (condition.valueType === 'attribute' && condition.referenceAttributeName) {
      return `${condition.attributeName} ${op} ${condition.referenceAttributeName}`;
    }

    const renderedValue = Array.isArray(condition.value)
      ? `[${condition.value.join(', ')}]`
      : `${condition.value}`;

    return `${condition.attributeName} ${op} ${renderedValue}`;
  };

  const getGlobalFilterGroupLines = () => {
    if (!globalFilterGroups || globalFilterGroups.length === 0) return [] as string[];
    return globalFilterGroups.map((group) =>
      group.conditions.map(getGlobalFilterConditionLabel).join(` ${group.logicalOperator} `)
    );
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

  const editingAttribute = selectedAttributes.find((attr) => attr.id === editingAttributeId);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {selectingMainObject ? 'Quelle est la donnée principale du rapport ?' : 'Ajoutez des données et configurez le rapport.'}
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
              <NavigationPanel
                onObjectInsert={handleObjectInsert}
                mainObject={mainObject ? { themeId: mainObject.themeId, objectId: mainObject.objectId } : undefined}
                showLinkedObjectCardinalities={showLinkedObjectCardinalities}
              />
            </div>

            <div className="flex w-1/2 flex-col border-l bg-white">
              <div className="border-b px-4 py-4">
                <div className="text-lg font-semibold text-gray-900">
                  {mainObject ? `Attributs sélectionnés pour le rapport sur les ${mainObject.objectName}` : 'Attributs sélectionnés'}
                </div>
              </div>

              <SelectionPanel
                selectedAttributes={selectedAttributes}
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-gray-700">Filtrage</div>
                    <button
                      onClick={() => setGlobalFilterDialogOpen(true)}
                      className={`flex items-center gap-1 rounded px-3 py-1.5 text-sm ${
                        globalFilterGroups && globalFilterGroups.length > 0
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Configurer le filtrage
                    </button>
                  </div>

                  {globalFilterGroups && globalFilterGroups.length > 0 ? (
                    <button
                      onClick={() => setGlobalFilterDialogOpen(true)}
                      className="w-full rounded border border-orange-200 bg-orange-50 p-2 text-left text-xs text-orange-800 hover:bg-orange-100"
                      title="Modifier le filtrage global"
                    >
                      <div className="mb-1 font-medium">{getGlobalFilterSummary()}</div>
                      <div className="space-y-1">
                        {getGlobalFilterGroupLines().map((line, index) => (
                          <div key={index}>
                            Groupe {index + 1}: {line}
                          </div>
                        ))}
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => setGlobalFilterDialogOpen(true)}
                      className="w-full rounded border border-orange-200 bg-orange-50 p-2 text-left text-xs text-orange-700 hover:bg-orange-100"
                      title="Configurer le filtrage global"
                    >
                      Aucun filtre global défini
                    </button>
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
                    insertionType: edited.insertionType,
                    selectedAttributeIds,
                    aggregationAttributeId: edited.insertionType === 'aggregation' ? edited.attributeId : undefined,
                    aggregationType: edited.aggregationType,
                    sortAttributeId: edited.sortAttributeId,
                    sortDirection: edited.sortDirection,
                  };
                })()
              : undefined
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
          name: `${attr.columnName || attr.attributeName} < ${attr.objectName}`,
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