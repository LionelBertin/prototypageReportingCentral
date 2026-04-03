import { useMemo, useState } from 'react';
import { dataStructure } from '../data/dataStructure';
import { InfoHint } from './InfoHint';

type Props = {
  onSelect: (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string
  ) => void;
};

export function MainObjectPicker({ onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});

  const lower = search.trim().toLowerCase();

  // Un objet est « secondaire » si sa cardinalité indique une relation strictement 1-à-1
  // avec un objet parent (ex : "1 <> 1 Collaborateur"). On le masque dans le picker.
  const getSelectableObjects = (theme: (typeof dataStructure)[number]) =>
    theme.objects.filter((obj) => !/^1\s+<>/.test(obj.cardinality));

  const renderObjectInsertionButtons = (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string
  ) => (
    <div className="flex shrink-0 items-center gap-1">
      <button
        onClick={() => onSelect(themeId, themeName, objectId, objectName)}
        className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
      >
        Faire un rapport
      </button>
    </div>
  );

  const filtered = useMemo(() => {
    if (!lower) {
      return dataStructure.map((theme) => ({
        ...theme,
        objects: getSelectableObjects(theme),
      }));
    }

    return dataStructure
      .map((theme) => ({
        ...theme,
        objects: getSelectableObjects(theme).filter(
          (o) => o.name.toLowerCase().includes(lower) || theme.name.toLowerCase().includes(lower)
        ),
      }))
      .filter((t) => t.objects.length > 0);
  }, [lower]);

  const visibleThemes = lower
    ? filtered
    : dataStructure.map((theme) => ({
        ...theme,
        objects: getSelectableObjects(theme),
      }));

  const toggleDomain = (themeId: string) => {
    setExpandedDomains((prev) => ({ ...prev, [themeId]: !prev[themeId] }));
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche une donnée..."
          className="w-72 rounded border px-3 py-2"
        />
      </div>

      <div className="space-y-3">
        {visibleThemes.map((theme) => {
          const isExpanded = !!expandedDomains[theme.id];
          return (
            <div key={theme.id} className="rounded border bg-white">
              <button
                onClick={() => toggleDomain(theme.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">{theme.name}</span>
                <span className="text-xs text-gray-500">{isExpanded ? 'v' : '>'}</span>
              </button>

              {isExpanded && (
                <div className="space-y-2 border-t px-3 py-3">
                  {theme.objects.map((obj) => (
                    <div
                      key={obj.id}
                      className="flex items-center justify-between gap-3 rounded border bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5 text-sm text-gray-800">
                        <span>{obj.name}</span>
                        <InfoHint text={obj.description} />
                      </div>
                      {renderObjectInsertionButtons(theme.id, theme.name, obj.id, obj.name)}
                    </div>
                  ))}
                  {theme.objects.length === 0 && (
                    <div className="px-1 py-1 text-xs text-gray-500">Aucun objet selectionnable.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {visibleThemes.length === 0 && (
          <div className="text-sm text-gray-500">Aucun domaine / objet correspondant.</div>
        )}
      </div>
    </div>
  );
}

export default MainObjectPicker;
