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
import { AttributeType, dataStructure } from '../data/dataStructure';

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
  mode: 'detailed' | 'aggregation' | 'special';
  isApplicable?: boolean;
  navigationPath?: NavigationPath;
};

type AvailableObjectAttribute = {
  id: string;
  name: string;
  rawName: string;
  type: AttributeType;
  magicSel?: boolean;
  smartSel?: boolean;
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
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [compartmentDialogOpen, setCompartmentDialogOpen] = useState(false);
  const [dateReferenceDialogOpen, setDateReferenceDialogOpen] = useState(false);
  const [conditionalColumnDialogOpen, setConditionalColumnDialogOpen] = useState(false);
  const [calculatedColumnDialogOpen, setCalculatedColumnDialogOpen] = useState(false);
  const [editingAggregationAttributeId, setEditingAggregationAttributeId] = useState<string | null>(null);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);
  const [editingObjectInstanceKey, setEditingObjectInstanceKey] = useState<string | null>(null);

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
      isApplicable: effectiveApplicable,
      dateReference: insertionType === 'applicable'
        ? (dateReference ?? { type: 'today' })
        : (effectiveApplicable ? { type: 'today' } : undefined),
      navigationPath,
    };
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
    const visitedObjects = new Set<string>();
    const seenAttributeIds = new Set<string>();

    const collect = (
      currentThemeId: string,
      currentObjectId: string,
      relationPath: string[],
      relativeNavigationPath: NavigationPath,
      shouldSmartSelect: boolean
    ) => {
      const currentKey = `${currentThemeId}::${currentObjectId}`;
      if (visitedObjects.has(currentKey)) return;

      const currentObject = objectByKey.get(currentKey);
      const currentTheme = themeById.get(currentThemeId);
      if (!currentObject) return;

      visitedObjects.add(currentKey);

      for (const attr of currentObject.attributes) {
        const compositeId = relationPath.length > 0
          ? `${currentKey}::${attr.id}`
          : attr.id;

        if (seenAttributeIds.has(compositeId)) continue;
        seenAttributeIds.add(compositeId);

        collected.push({
          id: compositeId,
          name: relationPath.length > 0
            ? `${relationPath.join(' > ')} > ${attr.name}`
            : attr.name,
          rawName: attr.name,
          type: attr.type,
          magicSel: attr.magicSel,
          smartSel: shouldSmartSelect && !!attr.magicSel,
          sourceThemeId: currentThemeId,
          sourceThemeName: currentTheme?.name ?? currentThemeId,
          sourceObjectId: currentObjectId,
          sourceObjectName: currentObject.name,
          relativeNavigationPath,
        });
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
    objectName: string,
    mode: 'detailed' | 'aggregation' | 'special'
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
      mode,
      isApplicable: obj.applicationDate || obj.isApplicable,
    });
    setObjectInsertionDialogOpen(true);
  };

  const handleObjectInsert = (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string,
    cardinality: string,
    mode: 'detailed' | 'aggregation' | 'special',
    isApplicable?: boolean,
    navigationPath?: NavigationPath
  ) => {
    setPendingObjectInsertion({
      themeId,
      themeName,
      objectId,
      objectName,
      cardinality,
      mode,
      isApplicable,
      navigationPath,
    });
    setObjectInsertionDialogOpen(true);
  };

  const handleObjectInsertionConfirm = (config: ObjectInsertionConfig) => {
    if (!pendingObjectInsertion) return;

    if (editingAggregationAttributeId) {
      if (config.insertionType !== 'aggregation') return;

      const objectAttributes = getObjectAttributes(pendingObjectInsertion.themeId, pendingObjectInsertion.objectId);
      const aggregatedAttr = objectAttributes.find((attr) => attr.id === config.aggregationAttributeId);
      if (!aggregatedAttr) return;

      setSelectedAttributes((prev) =>
        prev.map((attr) => {
          if (attr.id !== editingAggregationAttributeId) return attr;
          return {
            ...attr,
            attributeId: aggregatedAttr.id,
            attributeName: aggregatedAttr.rawName,
            attributeType: aggregatedAttr.type,
            insertionType: 'aggregation',
            aggregationType: config.aggregationType,
            sortAttributeId: config.sortAttributeId,
            sortDirection: config.sortDirection,
          };
        })
      );

      setEditingAggregationAttributeId(null);
      setPendingObjectInsertion(null);
      setObjectInsertionDialogOpen(false);
      return;
    }

    const isMainObjectSelection = selectingMainObject && !!pendingMainObject;

    const objectAttributes = getObjectAttributes(pendingObjectInsertion.themeId, pendingObjectInsertion.objectId);

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
        setSelectedAttributes((prev) => [...prev, newAttr]);
      }

      setPendingObjectInsertion(null);
      return;
    }

    const selectedIds = config.selectedAttributeIds ?? [];
    const newAttributes = objectAttributes
      .filter((attr) => selectedIds.includes(attr.id))
      .map((attr) =>
        buildSelectedAttribute({
          themeId: attr.sourceThemeId,
          themeName: attr.sourceThemeName,
          objectId: attr.sourceObjectId,
          objectName: attr.sourceObjectName,
          attributeId: attr.id,
          attributeName: attr.rawName,
          attributeType: attr.type,
          insertionType: config.insertionType,
          sortAttributeId: config.sortAttributeId,
          isApplicable: config.insertionType === 'applicable',
          dateReference: config.dateReference,
          navigationPath: [
            ...(pendingObjectInsertion.navigationPath ?? []),
            ...attr.relativeNavigationPath,
          ],
        })
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
        setSelectedAttributes(newAttributes);
      } else {
        setSelectedAttributes((prev) => [...prev, ...newAttributes]);
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

  const handleEditFilter = (id: string) => {
    const currentAttr = selectedAttributes.find((attr) => attr.id === id);
    if (!currentAttr || currentAttr.insertionType === 'applicable') return;
    setEditingAttributeId(id);
    setEditingObjectInstanceKey(getObjectInstanceKey(currentAttr));
    setFilterDialogOpen(true);
  };

  const handleFilterConfirm = (filterGroups?: FilterGroup[]) => {
    if (!editingAttributeId) return;

    const key = editingObjectInstanceKey;

    setSelectedAttributes((prev) =>
      prev.map((attr) =>
        key
          ? (getObjectInstanceKey(attr) === key ? { ...attr, filterGroups } : attr)
          : (attr.id === editingAttributeId ? { ...attr, filterGroups } : attr)
      )
    );
    setEditingAttributeId(null);
    setEditingObjectInstanceKey(null);
  };

  const handleEditCompartment = (id: string) => {
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
    setEditingAttributeId(id);
    setDateReferenceDialogOpen(true);
  };

  const handleDateReferenceConfirm = (dateReference: DateReference) => {
    if (!editingAttributeId) return;

    setSelectedAttributes((prev) =>
      prev.map((attr) =>
        attr.id === editingAttributeId ? { ...attr, dateReference } : attr
      )
    );
    setEditingAttributeId(null);
  };

  const handleEditConditionalColumn = (id: string) => {
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
    setEditingAttributeId(null);
    setConditionalColumnDialogOpen(true);
  };

  const handleEditCalculatedColumn = (id: string) => {
    setEditingAttributeId(id);
    setCalculatedColumnDialogOpen(true);
  };

  const handleEditAggregation = (id: string) => {
    const attr = selectedAttributes.find((a) => a.id === id);
    if (!attr || attr.insertionType !== 'aggregation') return;

    setEditingAggregationAttributeId(id);
    setPendingObjectInsertion({
      themeId: attr.themeId,
      themeName: attr.themeName,
      objectId: attr.objectId,
      objectName: attr.objectName,
      cardinality: attr.navigationPath?.[attr.navigationPath.length - 1]?.cardinalityName || '1',
      mode: 'aggregation',
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

  const getDateAttributeName = (attributeId: string): string => {
    const attr = selectedAttributes.find((a) => a.id === attributeId);
    if (attr) {
      return attr.attributeName;
    }
    return '';
  };

  const getAvailableDateAttributes = () => {
    return selectedAttributes.filter((attr) => attr.attributeType === 'date');
  };

  // Récupérer les attributs déjà sélectionnés pour comparaison dans les filtres
  const getSelectedAttributesForFilter = (currentAttributeId: string) => {
    return selectedAttributes
      .filter((attr) => attr.id !== currentAttributeId)
      .map((attr) => ({
        id: attr.id,
        name: attr.attributeName,
        columnName: attr.columnName || `${attr.attributeName} (${attr.objectName})`,
        type: attr.attributeType,
      }));
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

  // Récupérer les attributs de l'objet pour le filtrage (utile pour les agrégations)
  const getObjectAttributesForFilter = () => {
    if (!editingAttribute) return undefined;
    
    const theme = dataStructure.find((t) => t.id === editingAttribute.themeId);
    if (!theme) return undefined;

    const obj = theme.objects.find((o) => o.id === editingAttribute.objectId);
    if (!obj) return undefined;

    return obj.attributes;
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {selectingMainObject ? 'Choisir l\'objet principal du rapport' : 'Sélection des attributs pour le rapport'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {selectingMainObject
                ? 'Sélectionnez le domaine et l\'objet principal pour ce rapport.'
                : 'Ajoutez les attributs et configurez le rapport.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {selectingMainObject ? (
          <div className="w-full">
            <MainObjectPicker
              onSelect={handleMainObjectSelect}
            />
          </div>
        ) : (
          <>
            <div className="w-1/2">
              <NavigationPanel
                onObjectInsert={handleObjectInsert}
                mainObject={mainObject ? { themeId: mainObject.themeId, objectId: mainObject.objectId } : undefined}
              />
            </div>

            <div className="flex w-1/2 flex-col border-l bg-white">
              <div className="border-b px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-gray-900">
                    {mainObject?.objectName ?? 'Objet principal'}
                  </div>
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
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {mainObject ? `${mainObject.themeName} > ${mainObject.objectName}` : 'Objet principal non défini'}
                  {mainObjectConfig ? ` | ${getMainObjectModeLabel()}` : ''}
                </p>
              </div>

              <SelectionPanel
                selectedAttributes={selectedAttributes}
                onRemoveAttribute={handleRemoveAttribute}
                onEditFilter={handleEditFilter}
                onEditCompartment={handleEditCompartment}
                onEditDateReference={handleEditDateReference}
                onEditConditionalColumn={handleEditConditionalColumn}
                onEditCalculatedColumn={handleEditCalculatedColumn}
                onEditAggregation={handleEditAggregation}
                onReorder={handleReorder}
                onEditColumnName={handleEditColumnName}
                getDateAttributeName={getDateAttributeName}
              />
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
            if (selectingMainObject) {
              setPendingMainObject(null);
            }
          }}
          objectName={pendingObjectInsertion.objectName}
          cardinality={pendingObjectInsertion.cardinality}
          objectSupportsApplicable={!!pendingObjectInsertion.isApplicable}
          availableAttributes={getObjectAttributes(
            pendingObjectInsertion.themeId,
            pendingObjectInsertion.objectId
          )}
          availableDateAttributes={getAvailableDateAttributes().map((attr) => ({
            id: attr.id,
            name: attr.columnName || `${attr.attributeName} (${attr.objectName})`,
          }))}
          initialMode={pendingObjectInsertion.mode}
          initialConfig={
            editingAggregationAttributeId
              ? (() => {
                  const edited = selectedAttributes.find((a) => a.id === editingAggregationAttributeId);
                  if (!edited || edited.insertionType !== 'aggregation') return undefined;
                  return {
                    insertionType: 'aggregation' as const,
                    aggregationAttributeId: edited.attributeId,
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
          <FilterDialog
            isOpen={filterDialogOpen}
            onClose={() => {
              setFilterDialogOpen(false);
              setEditingAttributeId(null);
              setEditingObjectInstanceKey(null);
            }}
            attributeName={editingAttribute.attributeName}
            attributeType={editingAttribute.attributeType}
            currentFilterGroups={editingAttribute.filterGroups}
            onConfirm={handleFilterConfirm}
            objectAttributes={getObjectAttributesForFilter()}
            selectedFilterAttributes={getSelectedAttributesForFilter(editingAttribute.id)}
          />

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

      {!selectingMainObject && (
        <div className="border-t bg-white">
          <div className="flex">
            <div className="w-1/2" />
            <div className="w-1/2 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">
                    {selectedAttributes.length} champ{selectedAttributes.length !== 1 ? 's' : ''} dans le rapport
                  </div>
                  <button
                    onClick={handleCreateConditionalColumn}
                    className="rounded border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-100"
                    title="Créer une colonne conditionnelle qui évalue des expressions logiques"
                  >
                    + Colonne conditionnelle
                  </button>
                  <button
                    onClick={handleCreateCalculatedColumn}
                    className="rounded border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-100"
                    title="Créer une colonne calculée avec des opérations mathématiques ou logiques"
                  >
                    + Colonne calculée
                  </button>
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
    </div>
  );
}