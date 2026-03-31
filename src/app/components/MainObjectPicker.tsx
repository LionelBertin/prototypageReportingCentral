import { useMemo, useState } from 'react';
import { dataStructure } from '../data/dataStructure';

type Props = {
  onSelect: (
    themeId: string,
    themeName: string,
    objectId: string,
    objectName: string,
    mode: 'detailed' | 'aggregation' | 'special'
  ) => void;
};

export function MainObjectPicker({ onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

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
        onClick={() => onSelect(themeId, themeName, objectId, objectName, 'detailed')}
        className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
      >
        Liste detaillee
      </button>
      <button
        onClick={() => onSelect(themeId, themeName, objectId, objectName, 'aggregation')}
        className="rounded border border-purple-300 bg-purple-50 px-2 py-1 text-xs text-purple-700 hover:bg-purple-100"
      >
        Agregation
      </button>
      <button
        onClick={() => onSelect(themeId, themeName, objectId, objectName, 'special')}
        className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
      >
        Valeur speciale
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

  // If a domain is selected and there's no search, show only its objects
  if (selectedDomain && !lower) {
    const theme = dataStructure.find((t) => t.id === selectedDomain);
    const selectableObjects = theme ? getSelectableObjects(theme) : [];
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">{theme?.name}</div>
          <div>
            <button
              onClick={() => setSelectedDomain(null)}
              className="rounded border px-3 py-1 text-sm"
            >
              ← Retour
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {selectableObjects.map((obj) => (
            <div key={obj.id} className="flex items-center justify-between gap-3 rounded border bg-white px-4 py-3">
              <div className="text-sm font-medium text-gray-800">{obj.name}</div>
              {renderObjectInsertionButtons(theme.id, theme.name, obj.id, obj.name)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default view: if search is empty, show domains grid; if searching, show filtered domains with their matching objects
  return (
    <div className="p-6">
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un domaine ou un objet..."
          className="w-72 rounded border px-3 py-2"
        />
      </div>

      {!lower ? (
        <div className="grid grid-cols-3 gap-4">
          {dataStructure.map((theme) => (
            <div key={theme.id} className="rounded border bg-white p-6 shadow-sm">
              <button
                onClick={() => setSelectedDomain(theme.id)}
                className="w-full text-left text-lg font-medium"
              >
                {theme.name}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((theme) => (
            <div key={theme.id} className="rounded border bg-white p-4">
              <div className="text-lg font-semibold mb-2">{theme.name}</div>
              <div className="space-y-2">
                {theme.objects.map((obj) => (
                  <div key={obj.id} className="flex items-center justify-between gap-3 rounded border bg-gray-50 px-3 py-2">
                    <div className="text-sm text-gray-800">{obj.name}</div>
                    {renderObjectInsertionButtons(theme.id, theme.name, obj.id, obj.name)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-gray-500">Aucun domaine / objet correspondant.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default MainObjectPicker;
