import { useState, useMemo, useEffect } from 'react';
import type { ReactElement } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { dataStructure } from '../data/dataStructure';
import type { SelectedAttribute } from '../types/selection';
import { InfoHint } from './InfoHint';

type NavigationPath = NonNullable<SelectedAttribute['navigationPath']>;

interface NavigationPanelProps {
  onObjectInsert: (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string,
    cardinality: string,
    insertionMode: 'detailed' | 'operation' | 'aggregation' | 'special',
    isApplicable?: boolean,
    navigationPath?: NavigationPath
  ) => void;
  showOnlyObjects?: boolean;
  onObjectSelect?: (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string
  ) => void;
  mainObject?: {
    themeId: string;
    objectId: string;
  };
  showLinkedObjectCardinalities?: boolean;
}

export function NavigationPanel({
  onObjectInsert,
  showOnlyObjects = false,
  onObjectSelect,
  mainObject,
  showLinkedObjectCardinalities = false,
}: NavigationPanelProps) {
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const [expandedRelations, setExpandedRelations] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!mainObject) return;
    setExpandedObjects((prev) => {
      const next = new Set(prev);
      next.add(mainObject.objectId);
      return next;
    });
  }, [mainObject]);

  const filteredThemes = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result: typeof dataStructure = [] as any;

    for (const theme of dataStructure) {
      if (!term) {
        result.push(theme);
        continue;
      }

      const themeMatches = theme.name.toLowerCase().includes(term);

      const objects = theme.objects.filter((obj) => {
        if (obj.name.toLowerCase().includes(term)) return true;
        if (obj.attributes && obj.attributes.some((a) => a.name.toLowerCase().includes(term))) return true;
        if (obj.relations && obj.relations.some((r) => (r.label ?? '').toLowerCase().includes(term))) return true;
        return themeMatches;
      });

      if (objects.length > 0) {
        result.push({ ...theme, objects });
      }
    }

    return result;
  }, [search]);

  useEffect(() => {
    if (!search.trim()) return;
    setExpandedThemes(new Set(filteredThemes.map((theme) => theme.id)));
  }, [search, filteredThemes]);

  const toggleTheme = (themeId: string) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(themeId)) newExpanded.delete(themeId);
    else newExpanded.add(themeId);
    setExpandedThemes(newExpanded);
  };

  const toggleObject = (objectId: string) => {
    const newExpanded = new Set(expandedObjects);
    if (newExpanded.has(objectId)) newExpanded.delete(objectId);
    else newExpanded.add(objectId);
    setExpandedObjects(newExpanded);
  };

  // By default, all relation nodes are expanded. This set stores collapsed relation keys.
  const toggleRelation = (relationKey: string) => {
    const newExpanded = new Set(expandedRelations);
    if (newExpanded.has(relationKey)) newExpanded.delete(relationKey);
    else newExpanded.add(relationKey);
    setExpandedRelations(newExpanded);
  };

  const findObject = (themeId: string, objectId: string) => {
    const theme = dataStructure.find((t) => t.id === themeId);
    if (!theme) return null;
    return theme.objects.find((o) => o.id === objectId);
  };

  const getThemeNameById = (themeId: string) => {
    const theme = dataStructure.find((t) => t.id === themeId);
    return theme?.name ?? themeId;
  };

  const isSingleCardinality = (cardinality?: string) => {
    if (!cardinality) return true;
    return !cardinality.includes('n');
  };

  const buildObjectKey = (themeId: string, objectId: string) => `${themeId}::${objectId}`;

  const normalizeCardinalityToken = (value?: string) => {
    if (!value) return '1';
    const trimmed = value.trim();
    if (!trimmed) return '1';
    const token = trimmed.split(' ')[0]?.trim() ?? '1';
    return token || '1';
  };

  const splitObjectCardinalitySegments = (cardinality: string) => {
    return cardinality
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);
  };

  const getRelationSides = (
    objectCardinality: string,
    relationIndex: number,
    relationCardinality?: string
  ) => {
    const segments = splitObjectCardinalitySegments(objectCardinality);
    const segment = segments[relationIndex] ?? segments[0] ?? '1';
    const parts = segment.split('<>');

    const sourceSide = normalizeCardinalityToken(parts[0]);
    const targetFromSegment = normalizeCardinalityToken(parts[1]);
    const targetFromRelation = normalizeCardinalityToken(relationCardinality);

    return {
      sourceSide,
      targetSide: relationCardinality ? targetFromRelation : targetFromSegment,
    };
  };

  const outgoingGraph = useMemo(() => {
    const graph = new Map<
      string,
      Array<{ targetKey: string; sourceCardinality: string; targetCardinality: string }>
    >();

    for (const theme of dataStructure) {
      for (const object of theme.objects) {
        const fromKey = buildObjectKey(theme.id, object.id);
        const edges = (object.relations ?? []).map((relation, relationIndex) => {
          const { sourceSide, targetSide } = getRelationSides(
            object.cardinality,
            relationIndex,
            relation.cardinality
          );

          return {
            targetKey: buildObjectKey(relation.targetThemeId, relation.targetObjectId),
            sourceCardinality: sourceSide,
            targetCardinality: targetSide,
          };
        });
        graph.set(fromKey, edges);
      }
    }

    return graph;
  }, []);

  const undirectedSingleGraph = useMemo(() => {
    const graph = new Map<string, string[]>();

    const addEdge = (from: string, to: string) => {
      const current = graph.get(from) ?? [];
      current.push(to);
      graph.set(from, current);
    };

    for (const [fromKey, edges] of outgoingGraph.entries()) {
      for (const edge of edges) {
        if (!isSingleCardinality(edge.sourceCardinality) || !isSingleCardinality(edge.targetCardinality)) {
          continue;
        }
        addEdge(fromKey, edge.targetKey);
        addEdge(edge.targetKey, fromKey);
      }
    }

    return graph;
  }, [outgoingGraph]);

  const descendingGraph = useMemo(() => {
    const graph = new Map<string, string[]>();

    const addEdge = (from: string, to: string) => {
      const current = graph.get(from) ?? [];
      current.push(to);
      graph.set(from, current);
    };

    for (const [fromKey, edges] of outgoingGraph.entries()) {
      for (const edge of edges) {
        const leftIsSingle = isSingleCardinality(edge.sourceCardinality);
        const rightIsSingle = isSingleCardinality(edge.targetCardinality);

        // Descendant means going from the "1" side to the "n" side.
        if (leftIsSingle && !rightIsSingle) {
          addEdge(fromKey, edge.targetKey);
          continue;
        }
        if (!leftIsSingle && rightIsSingle) {
          addEdge(edge.targetKey, fromKey);
          continue;
        }

        // 1-1 links are traversable both ways.
        if (leftIsSingle && rightIsSingle) {
          addEdge(fromKey, edge.targetKey);
          addEdge(edge.targetKey, fromKey);
        }
      }
    }

    return graph;
  }, [outgoingGraph]);

  const functionalGraph = useMemo(() => {
    const graph = new Map<string, string[]>();

    const addEdge = (from: string, to: string) => {
      const current = graph.get(from) ?? [];
      current.push(to);
      graph.set(from, current);
    };

    for (const [fromKey, edges] of outgoingGraph.entries()) {
      for (const edge of edges) {
        const sourceIsSingle = isSingleCardinality(edge.sourceCardinality);
        const targetIsSingle = isSingleCardinality(edge.targetCardinality);

        // From source object to target object, multiplicity is target side.
        if (targetIsSingle) {
          addEdge(fromKey, edge.targetKey);
        }

        // Reverse traversal multiplicity is source side.
        if (sourceIsSingle) {
          addEdge(edge.targetKey, fromKey);
        }
      }
    }

    return graph;
  }, [outgoingGraph]);

  const hasPath = (graph: Map<string, string[]>, start: string, end: string) => {
    if (start === end) return true;

    const visited = new Set<string>();
    const queue: string[] = [start];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = graph.get(current) ?? [];
      for (const next of neighbors) {
        if (next === end) return true;
        if (!visited.has(next)) queue.push(next);
      }
    }

    return false;
  };

  const hasDescendingPath = (start: string, end: string) => {
    if (start === end) return true;

    const visited = new Set<string>();
    const queue: string[] = [start];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = descendingGraph.get(current) ?? [];
      for (const next of neighbors) {
        if (next === end) return true;
        if (!visited.has(next)) queue.push(next);
      }
    }

    return false;
  };

  const hasFunctionalPath = (start: string, end: string) => {
    if (start === end) return true;

    const visited = new Set<string>();
    const queue: string[] = [start];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = functionalGraph.get(current) ?? [];
      for (const next of neighbors) {
        if (next === end) return true;
        if (!visited.has(next)) queue.push(next);
      }
    }

    return false;
  };

  const canUseDetailedInsertion = (targetThemeId: string, targetObjectId: string) => {
    if (!mainObject) return true;

    const startKey = buildObjectKey(mainObject.themeId, mainObject.objectId);
    const endKey = buildObjectKey(targetThemeId, targetObjectId);

    return hasDescendingPath(startKey, endKey) || hasPath(undirectedSingleGraph, startKey, endKey);
  };

  const canAddFieldsInsertion = (targetThemeId: string, targetObjectId: string) => {
    if (!mainObject) return true;

    const startKey = buildObjectKey(mainObject.themeId, mainObject.objectId);
    const endKey = buildObjectKey(targetThemeId, targetObjectId);

    return hasFunctionalPath(startKey, endKey);
  };

  const directLinkedObjectKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!mainObject) return keys;

    const mainObj = findObject(mainObject.themeId, mainObject.objectId);
    keys.add(buildObjectKey(mainObject.themeId, mainObject.objectId));

    for (const relation of mainObj?.relations ?? []) {
      keys.add(buildObjectKey(relation.targetThemeId, relation.targetObjectId));
    }

    for (const theme of dataStructure) {
      for (const object of theme.objects) {
        for (const relation of object.relations ?? []) {
          if (
            relation.targetThemeId === mainObject.themeId &&
            relation.targetObjectId === mainObject.objectId
          ) {
            keys.add(buildObjectKey(theme.id, object.id));
          }
        }
      }
    }

    return keys;
  }, [mainObject]);

  const otherThemes = useMemo(() => {
    if (!mainObject) return filteredThemes;

    const remaining = filteredThemes
      .map((theme) => ({
        ...theme,
        objects: theme.objects.filter(
          (obj) => !directLinkedObjectKeys.has(buildObjectKey(theme.id, obj.id))
        ),
      }))
      .filter((theme) => theme.objects.length > 0);

    return [
      ...remaining.filter((theme) => theme.id === mainObject.themeId),
      ...remaining.filter((theme) => theme.id !== mainObject.themeId),
    ];
  }, [filteredThemes, directLinkedObjectKeys, mainObject]);

  const renderThemesList = (themesToRender: typeof dataStructure) => (
    <div className="space-y-2">
      {themesToRender.map((theme) => (
        <div key={theme.id}>
          <button
            onClick={() => toggleTheme(theme.id)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-200"
          >
            {expandedThemes.has(theme.id) ? (
              <ChevronDown className="size-4 text-gray-600" />
            ) : (
              <ChevronRight className="size-4 text-gray-600" />
            )}
            <span className="font-medium text-gray-900">{theme.name}</span>
          </button>

          {expandedThemes.has(theme.id) && (
            <div className="ml-4 mt-1 space-y-1">
              {(showOnlyObjects
                ? theme.objects.filter((obj) => !/^1\s+<>/.test(obj.cardinality))
                : theme.objects
              ).map((obj) => (
                <div key={obj.id}>
                  {showOnlyObjects ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onObjectSelect && onObjectSelect(theme.id, theme.name, obj.id, obj.name)}
                        className="flex flex-1 items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-200"
                      >
                        <span className="text-gray-700">{obj.name}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleObject(obj.id)}
                          className="flex flex-1 items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-200"
                        >
                          {expandedObjects.has(obj.id) ? (
                            <ChevronDown className="size-3 text-gray-500" />
                          ) : (
                            <ChevronRight className="size-3 text-gray-500" />
                          )}
                          <span className="text-gray-700">{obj.name}</span>
                        </button>
                        {renderObjectInsertButtons(
                          theme.id,
                          theme.name,
                          obj.id,
                          obj.name,
                          obj.cardinality,
                          obj.applicationDate || obj.isApplicable
                        )}
                      </div>

                      {expandedObjects.has(obj.id) && (
                        <div className="ml-6 mt-1 space-y-0.5">
                          {renderRelations(
                            obj.id,
                            theme.id,
                            theme.name,
                            obj.id,
                            obj.name,
                            obj.cardinality
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const mainObjectContext = useMemo(() => {
    if (!mainObject) return null;
    const theme = dataStructure.find((t) => t.id === mainObject.themeId);
    if (!theme) return null;
    const object = theme.objects.find((o) => o.id === mainObject.objectId);
    if (!object) return null;
    return { theme, object };
  }, [mainObject]);

  const renderObjectInsertButtons = (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string,
    cardinality: string,
    objectIsApplicable?: boolean,
    navigationPath?: NavigationPath
  ) => {
    const allowDetailedInsertion = canUseDetailedInsertion(themeId, objectId);
    const allowAddFieldsInsertion = canAddFieldsInsertion(themeId, objectId);
    const isDirectlyNavigable = Boolean(navigationPath && navigationPath.length > 0);
    const showSelectionButton = isDirectlyNavigable || allowDetailedInsertion || allowAddFieldsInsertion;
    const isLinkedObject = Boolean(navigationPath && navigationPath.length > 0);
    const showAggregationButton = !(isLinkedObject && isSingleCardinality(cardinality));
    const showSpecialValueButton = Boolean(objectIsApplicable);

    return (
      <div className="flex shrink-0 items-center gap-1">
        {/* Slot 1 : Sélectionner des attributs — toujours présent pour l'alignement */}
        {showSelectionButton ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onObjectInsert(
                themeId,
                themeName,
                objectId,
                objectName,
                cardinality,
                'detailed',
                objectIsApplicable,
                navigationPath
              );
            }}
            className="w-36 rounded border border-blue-300 bg-blue-50 px-2 py-1 text-center text-xs text-blue-700 hover:bg-blue-100"
            title="Sélectionner des attributs de cet objet"
          >
            Sélectionner des attributs
          </button>
        ) : (
          <div className="w-36" />
        )}
        {/* Slot 2 : Agrégation */}
        {showAggregationButton ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onObjectInsert(
                themeId,
                themeName,
                objectId,
                objectName,
                cardinality,
                'operation',
                objectIsApplicable,
                navigationPath
              );
            }}
            className="w-24 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-center text-xs text-amber-700 hover:bg-amber-200"
            title="Insérer une opération"
          >
            Opération
          </button>
        ) : (
          <div className="w-24" />
        )}
        {/* Slot 3 : Valeur spéciale */}
        {showSpecialValueButton ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onObjectInsert(
                themeId,
                themeName,
                objectId,
                objectName,
                cardinality,
                'special',
                objectIsApplicable,
                navigationPath
              );
            }}
            className="w-28 rounded border border-purple-300 bg-purple-100 px-2 py-1 text-center text-xs text-purple-700 hover:bg-purple-200"
            title="Insérer une valeur spéciale"
          >
            Valeur spéciale
          </button>
        ) : (
          <div className="w-28" />
        )}
      </div>
    );
  };

  const renderRelations = (
    parentKey: string,
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string,
    cardinality: string,
    pathLabel: string = '',
    depth: number = 0,
    visitedObjects: Set<string> = new Set(),
    navigationPath: NavigationPath = [],
    parentObject?: { themeId: string; objectId: string }
  ): ReactElement | null => {
    const obj = findObject(themeId, objectId);
    if (!obj || !obj.relations || obj.relations.length === 0) return null;

    const objectKey = `${themeId}-${objectId}`;
    if (visitedObjects.has(objectKey)) return null;
    const newVisitedObjects = new Set(visitedObjects);
    newVisitedObjects.add(objectKey);
    const isCurrentObject = (candidateThemeId: string, candidateObjectId: string) =>
      candidateThemeId === themeId && candidateObjectId === objectId;
    const isParentObject = (candidateThemeId: string, candidateObjectId: string) =>
      !!parentObject &&
      candidateThemeId === parentObject.themeId &&
      candidateObjectId === parentObject.objectId;
    const isAlreadyInPath = (candidateThemeId: string, candidateObjectId: string) =>
      newVisitedObjects.has(`${candidateThemeId}-${candidateObjectId}`);

    type InboundSource = {
      themeId: string;
      themeName: string;
      objectId: string;
      objectName: string;
      sourceLabel?: string;
    };

    const getFilteredInboundSources = (
      currentThemeId: string,
      currentObjectId: string,
      currentVisitedObjects: Set<string>,
      currentParentObject?: { themeId: string; objectId: string }
    ): InboundSource[] => {
      const inboundSources: InboundSource[] = [];

      for (const t of dataStructure) {
        for (const o of t.objects) {
          if (!o.relations) continue;
          for (const r of o.relations) {
            if (r.targetThemeId === currentThemeId && r.targetObjectId === currentObjectId) {
              inboundSources.push({
                themeId: t.id,
                themeName: t.name,
                objectId: o.id,
                objectName: o.name,
                sourceLabel: r.label,
              });
              break;
            }
          }
        }
      }

      return inboundSources.filter((src) => {
        const srcKey = `${src.themeId}-${src.objectId}`;
        if (currentVisitedObjects.has(srcKey)) return false;
        if (src.themeId === currentThemeId && src.objectId === currentObjectId) return false;
        if (
          currentParentObject &&
          src.themeId === currentParentObject.themeId &&
          src.objectId === currentParentObject.objectId
        ) {
          return false;
        }
        return true;
      });
    };

    const hasVisibleChildren = (
      currentThemeId: string,
      currentObjectId: string,
      currentVisitedObjects: Set<string>,
      currentParentObject?: { themeId: string; objectId: string }
    ) => {
      const currentObj = findObject(currentThemeId, currentObjectId);
      if (!currentObj) return false;

      const hasDirectChildren = (currentObj.relations ?? []).some((rel) => {
        const targetKey = `${rel.targetThemeId}-${rel.targetObjectId}`;
        if (currentVisitedObjects.has(targetKey)) return false;
        if (
          currentParentObject &&
          rel.targetThemeId === currentParentObject.themeId &&
          rel.targetObjectId === currentParentObject.objectId
        ) {
          return false;
        }
        return !!findObject(rel.targetThemeId, rel.targetObjectId);
      });

      if (hasDirectChildren) return true;

      return (
        getFilteredInboundSources(
          currentThemeId,
          currentObjectId,
          currentVisitedObjects,
          currentParentObject
        ).length > 0
      );
    };

    return (
      <div className="mt-2 space-y-1 border-t border-gray-300 pt-2">
        {obj.relations.map((relation, idx) => {
          const relationKey = `${parentKey}-${relation.targetObjectId}-${idx}`;
          if (isParentObject(relation.targetThemeId, relation.targetObjectId)) return null;
          if (isAlreadyInPath(relation.targetThemeId, relation.targetObjectId)) return null;

          const relatedObj = findObject(relation.targetThemeId, relation.targetObjectId);
          if (!relatedObj) return null;

          const currentPath = pathLabel ? `${pathLabel} - ${relation.label}` : relation.label;
          const relatedVisitedObjects = new Set(newVisitedObjects);
          relatedVisitedObjects.add(`${relation.targetThemeId}-${relation.targetObjectId}`);
          const relationHasChildren = hasVisibleChildren(
            relation.targetThemeId,
            relation.targetObjectId,
            relatedVisitedObjects,
            {
              themeId,
              objectId,
            }
          );
          const filteredInboundSources = getFilteredInboundSources(
            relation.targetThemeId,
            relation.targetObjectId,
            relatedVisitedObjects,
            {
              themeId,
              objectId,
            }
          );

          return (
            <div key={relationKey} className="ml-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (!relationHasChildren) return;
                    toggleRelation(relationKey);
                  }}
                  className="flex flex-1 items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-left text-xs hover:bg-blue-100"
                >
                  {relationHasChildren &&
                    (expandedRelations.has(relationKey) ? (
                      <ChevronRight className="size-3 text-blue-600" />
                    ) : (
                      <ChevronDown className="size-3 text-blue-600" />
                    ))}
                  <span className="text-blue-700">{relatedObj.name}</span>
                  <InfoHint text={relatedObj.description} className="inline-flex items-center text-blue-400 hover:text-blue-600" />
                  {relation.label !== relatedObj.name && (
                    <span className="text-blue-500">- {relation.label}</span>
                  )}
                  <InfoHint text={relation.description} className="inline-flex items-center text-blue-400 hover:text-blue-600" />
                  {showLinkedObjectCardinalities && relation.cardinality && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                      {relation.cardinality}
                    </span>
                  )}
                </button>
                {renderObjectInsertButtons(
                  relation.targetThemeId,
                  getThemeNameById(relation.targetThemeId),
                  relation.targetObjectId,
                  relatedObj.name,
                  relation.cardinality,
                  relatedObj.applicationDate || relatedObj.isApplicable,
                  [
                    ...navigationPath,
                    {
                      objectName: relatedObj.name,
                      cardinalityName: relation.cardinality,
                      relationLabel: relation.label,
                      sourceObjectName: objectName,
                    },
                  ]
                )}
              </div>

              {relationHasChildren && !expandedRelations.has(relationKey) && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {(() => {
                    if (filteredInboundSources.length === 0) return null;

                    return (
                      <div className="mt-2 space-y-1 border-t border-dashed border-gray-200 pt-2">
                        {filteredInboundSources.map((src) => (
                          <div key={`${src.themeId}-${src.objectId}`} className="ml-2">
                            {(() => {
                              const inboundKey = `${relationKey}-inbound-${src.themeId}-${src.objectId}`;
                              const theme = dataStructure.find((tt) => tt.id === src.themeId);
                              const obj = theme?.objects.find((oo) => oo.id === src.objectId);
                              if (!obj) return null;
                              const inboundVisitedObjects = new Set(relatedVisitedObjects);
                              inboundVisitedObjects.add(`${src.themeId}-${src.objectId}`);
                              const inboundHasChildren = hasVisibleChildren(
                                src.themeId,
                                src.objectId,
                                inboundVisitedObjects,
                                {
                                  themeId: relation.targetThemeId,
                                  objectId: relation.targetObjectId,
                                }
                              );

                              return (
                                <>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        if (!inboundHasChildren) return;
                                        toggleRelation(inboundKey);
                                      }}
                                      className="flex w-full flex-1 items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-left text-xs hover:bg-blue-100"
                                    >
                                    {inboundHasChildren &&
                                      (expandedRelations.has(inboundKey) ? (
                                        <ChevronRight className="size-3 text-blue-600" />
                                      ) : (
                                        <ChevronDown className="size-3 text-blue-600" />
                                      ))}
                                    <span className="text-blue-700">{src.objectName}</span>
                                    <InfoHint text={obj.description} className="inline-flex items-center text-blue-400 hover:text-blue-600" />
                                    {src.sourceLabel && src.sourceLabel !== src.objectName && (
                                      <span className="text-blue-500">- {src.sourceLabel}</span>
                                    )}
                                    {showLinkedObjectCardinalities && obj.cardinality && (
                                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                                        {obj.cardinality}
                                      </span>
                                    )}
                                    </button>
                                    {renderObjectInsertButtons(
                                      src.themeId,
                                      src.themeName,
                                      src.objectId,
                                      src.objectName,
                                      obj.cardinality,
                                      obj.applicationDate || obj.isApplicable,
                                      [
                                        ...navigationPath,
                                        {
                                          objectName: src.objectName,
                                          cardinalityName: obj.cardinality,
                                          relationLabel: src.sourceLabel,
                                          sourceObjectName: relatedObj.name,
                                        },
                                      ]
                                    )}
                                  </div>

                                  {inboundHasChildren && !expandedRelations.has(inboundKey) && (
                                    <div className="ml-2 mt-1 space-y-0.5">
                                      {renderRelations(
                                        inboundKey,
                                        src.themeId,
                                        src.themeName,
                                        src.objectId,
                                        src.objectName,
                                        obj.cardinality,
                                        `${currentPath} - ${src.objectName}`,
                                        depth + 1,
                                        newVisitedObjects,
                                        [
                                          ...navigationPath,
                                          {
                                            objectName: src.objectName,
                                            cardinalityName: obj.cardinality,
                                            relationLabel: src.sourceLabel,
                                            sourceObjectName: relatedObj.name,
                                          },
                                        ],
                                        {
                                          themeId: relation.targetThemeId,
                                          objectId: relation.targetObjectId,
                                        }
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {renderRelations(
                    relationKey,
                    relation.targetThemeId,
                    themeName,
                    relation.targetObjectId,
                    relatedObj.name,
                    relation.cardinality,
                    currentPath,
                    depth + 1,
                    newVisitedObjects,
                    [
                      ...navigationPath,
                      {
                        objectName: relatedObj.name,
                        cardinalityName: relation.cardinality,
                        relationLabel: relation.label,
                        sourceObjectName: objectName,
                      },
                    ],
                    {
                      themeId,
                      objectId,
                    }
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto border-r bg-gray-50 p-4">
      <h2 className="mb-2 font-semibold text-gray-900">Données disponibles</h2>

      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un objet ou un attribut"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {mainObject && !showOnlyObjects ? (
        <div className="space-y-4">
          <div className="rounded border border-blue-200 bg-white p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
              {mainObjectContext?.object.name ?? 'Objet principal'}
            </h3>

            {mainObjectContext ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleObject(mainObjectContext.object.id)}
                    className="flex flex-1 items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100"
                  >
                    {expandedObjects.has(mainObjectContext.object.id) ? (
                      <ChevronDown className="size-3 text-gray-500" />
                    ) : (
                      <ChevronRight className="size-3 text-gray-500" />
                    )}
                    <span className="font-medium text-gray-800">{mainObjectContext.object.name}</span>
                  </button>
                  {renderObjectInsertButtons(
                    mainObjectContext.theme.id,
                    mainObjectContext.theme.name,
                    mainObjectContext.object.id,
                    mainObjectContext.object.name,
                    mainObjectContext.object.cardinality,
                    mainObjectContext.object.applicationDate || mainObjectContext.object.isApplicable
                  )}
                </div>

                {expandedObjects.has(mainObjectContext.object.id) && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {renderRelations(
                      `main-${mainObjectContext.object.id}`,
                      mainObjectContext.theme.id,
                      mainObjectContext.theme.name,
                      mainObjectContext.object.id,
                      mainObjectContext.object.name,
                      mainObjectContext.object.cardinality
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500">Objet principal introuvable dans la structure.</p>
            )}
          </div>


        </div>
      ) : (
        renderThemesList(filteredThemes)
      )}
    </div>
  );
}
