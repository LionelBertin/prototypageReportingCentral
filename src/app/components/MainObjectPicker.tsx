import { X } from 'lucide-react';
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
  preferredExpandedDomain?: string;
};

export function MainObjectPicker({ onSelect, preferredExpandedDomain }: Props) {
  const [search, setSearch] = useState('');
  const normalizeToken = (value: string) => value.trim().toLowerCase();
  const normalizedPreferredDomain = preferredExpandedDomain ? normalizeToken(preferredExpandedDomain) : '';
  const initialExpandedDomains = normalizedPreferredDomain
    ? Object.fromEntries(
        dataStructure
          .filter((theme) => {
            const normalizedThemeId = normalizeToken(theme.id);
            const normalizedThemeName = normalizeToken(theme.name);

            if (normalizedThemeName === normalizedPreferredDomain) return true;
            if (normalizedThemeName === `les ${normalizedPreferredDomain}`) return true;
            if (normalizedThemeId === normalizedPreferredDomain) return true;
            if (normalizedThemeId === `les-${normalizedPreferredDomain.replace(/\s+/g, '-')}`) return true;
            return false;
          })
          .map((theme) => [theme.id, true])
      )
    : {};
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>(initialExpandedDomains);

  const lower = search.trim().toLowerCase();

  const isCollaboratorsTheme = (theme: (typeof dataStructure)[number]) =>
    normalizeToken(theme.id) === 'les-collaborateurs' || normalizeToken(theme.name) === 'les collaborateurs';

  const isCollaborateurObject = (object: (typeof dataStructure)[number]['objects'][number]) =>
    normalizeToken(object.id) === 'collaborateur' || normalizeToken(object.name) === 'collaborateur';

  const isMultipleCardinalityObject = (object: (typeof dataStructure)[number]['objects'][number]) =>
    object.cardinality.toLowerCase().includes('n');

  const getSelectableObjects = (theme: (typeof dataStructure)[number]) =>
    [...theme.objects]
      .filter((obj) => {
        if (!isCollaboratorsTheme(theme)) return true;
        return isCollaborateurObject(obj) || isMultipleCardinalityObject(obj);
      })
      .sort((a, b) => {
      if (a.isStarred === b.isStarred) return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      return a.isStarred ? -1 : 1;
    });

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
      <div className="mb-4 relative w-72">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche une donnée..."
          className="w-full rounded border px-3 py-2 pr-10"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Effacer la recherche"
            aria-label="Effacer la recherche"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {visibleThemes.map((theme) => {
          const isExpanded = !!lower || !!expandedDomains[theme.id];
          return (
            <div key={theme.id} className="rounded border bg-white">
              <button
                onClick={() => toggleDomain(theme.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <span>{theme.name}</span>
                  <InfoHint text={theme.tooltip} />
                </span>
                <span className="text-xs text-gray-500">{isExpanded ? 'v' : '>'}</span>
              </button>

              {isExpanded && (
                <div className="border-t px-3 py-3">
                  {(() => {
                    const starred = theme.objects.filter((o) => o.isStarred);
                    const others = theme.objects.filter((o) => !o.isStarred);
                    const renderObj = (obj: typeof theme.objects[number]) => (
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
                    );
                    return (
                      <>
                        {starred.length > 0 && (
                          <div className="mb-2">
                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Données fréquentes</p>
                            <div className="space-y-2">{starred.map(renderObj)}</div>
                          </div>
                        )}
                        {starred.length > 0 && others.length > 0 && (
                          <div className="my-2 border-t border-gray-200" />
                        )}
                        {others.length > 0 && (
                          <div>
                            {starred.length > 0 && (
                              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Autres données</p>
                            )}
                            <div className="space-y-2">{others.map(renderObj)}</div>
                          </div>
                        )}
                        {theme.objects.length === 0 && (
                          <div className="px-1 py-1 text-xs text-gray-500">Aucun objet selectionnable.</div>
                        )}
                      </>
                    );
                  })()}
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
