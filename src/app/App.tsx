import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AttributeSelector } from './components/AttributeSelector';

type PermissionCode = 'CREATEREPORT' | 'EDITREPORT' | 'SHAREREPORT' | 'AUTOREPORT' | 'SENDREPORT';

type PermissionsMap = Record<PermissionCode, boolean>;

type ReportDomain =
  | 'Collaborateurs'
  | 'Congés'
  | 'Dépenses'
  | 'Documents partagés'
  | 'Enquête engagement'
  | 'Factures'
  | 'Formations'
  | 'Recrutement'
  | 'Référentiels'
  | 'Rémunérations'
  | 'Talent & compétences';

type HomeReport = {
  id: string;
  title: string;
  ownedByMe: boolean;
  domain: ReportDomain;
  mainObjectName: string;
};

type HomeSection = {
  key: string;
  title: string;
  deletable: boolean;
  reports: HomeReport[];
};

const defaultPermissions: PermissionsMap = {
  CREATEREPORT: true,
  EDITREPORT: true,
  SHAREREPORT: true,
  AUTOREPORT: false,
  SENDREPORT: true,
};

const reportDomains: ReportDomain[] = [
  'Collaborateurs',
  'Congés',
  'Dépenses',
  'Documents partagés',
  'Enquête engagement',
  'Factures',
  'Formations',
  'Recrutement',
  'Référentiels',
  'Rémunérations',
  'Talent & compétences',
];

const clonePermissions = (source: PermissionsMap): PermissionsMap => ({ ...source });

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'workspace'>('home');
  const [permissions, setPermissions] = useState<PermissionsMap>(defaultPermissions);
  const [draftPermissions, setDraftPermissions] = useState<PermissionsMap>(defaultPermissions);
  const [prototypeConfigOpen, setPrototypeConfigOpen] = useState(false);
  const [workspaceSessionId, setWorkspaceSessionId] = useState(1);
  const [workspaceMode, setWorkspaceMode] = useState<'new' | 'consultation'>('new');
  const [consultationReportTitle, setConsultationReportTitle] = useState<string>('');
  const [consultationOwnedByMe, setConsultationOwnedByMe] = useState(true);
  const [consultationReportContext, setConsultationReportContext] = useState<HomeReport | null>(null);
  const [workspaceReportDisplayName, setWorkspaceReportDisplayName] = useState('');
  const [selectedHomeDomain, setSelectedHomeDomain] = useState<ReportDomain | null>(null);
  const [homeReportSearchTerm, setHomeReportSearchTerm] = useState('');

  const [homeSections, setHomeSections] = useState<HomeSection[]>([
    {
      key: 'fresh',
      title: 'Nouveaux rapports disponibles',
      deletable: true,
      reports: [
        { id: 'r-1', title: 'Contrats actifs - Avril', ownedByMe: true, domain: 'Collaborateurs', mainObjectName: 'Contrats' },
      ],
    },
    {
      key: 'favorites',
      title: 'Favoris',
      deletable: true,
      reports: [
        { id: 'r-3', title: 'Postes par département', ownedByMe: true, domain: 'Collaborateurs', mainObjectName: 'Postes' },
        { id: 'r-4', title: 'Formations certifiées', ownedByMe: true, domain: 'Formations', mainObjectName: 'Formations' },
      ],
    },
    {
      key: 'saved',
      title: 'Rapports enregistrés',
      deletable: true,
      reports: [
        { id: 'r-5', title: 'Évolution des soldes', ownedByMe: true, domain: 'Congés', mainObjectName: 'Évolution des soldes' },
        { id: 'r-6', title: 'Rémunérations mensuelles', ownedByMe: true, domain: 'Rémunérations', mainObjectName: 'Rémunération mensuelle réelle' },
        { id: 'r-13', title: 'Liste des contrats terminés', ownedByMe: true, domain: 'Collaborateurs', mainObjectName: 'Contrats' },
      ],
    },
    {
      key: 'bu',
      title: 'Rapports Lucca',
      deletable: false,
      reports: [
        { id: 'r-7', title: 'Synthèse RH mensuelle BU France', ownedByMe: false, domain: 'Collaborateurs', mainObjectName: 'Collaborateur' },
        { id: 'r-8', title: 'Contrôles paie BU Suisse', ownedByMe: false, domain: 'Rémunérations', mainObjectName: 'Rémunération théorique annuelle' },
        { id: 'r-14', title: 'Pilotage recrutements BU Conseil', ownedByMe: false, domain: 'Recrutement', mainObjectName: 'Postes à pourvoir' },
        { id: 'r-15', title: 'Suivi masse salariale BU Espagne', ownedByMe: false, domain: 'Rémunérations', mainObjectName: 'Rémunération mensuelle réelle' },
      ],
    },
    {
      key: 'shared',
      title: 'Rapports partagés',
      deletable: false,
      reports: [
        { id: 'r-9', title: 'Suivi forfaits jours - Direction', ownedByMe: false, domain: 'Congés', mainObjectName: 'Suivi forfaits jours' },
        { id: 'r-10', title: 'Statistiques absences - N-1', ownedByMe: false, domain: 'Congés', mainObjectName: 'Statistiques des absences' },
        { id: 'r-16', title: 'Analyse turnover équipe Finance', ownedByMe: false, domain: 'Collaborateurs', mainObjectName: 'Collaborateur' },
        { id: 'r-17', title: 'Historique formations obligatoires', ownedByMe: false, domain: 'Formations', mainObjectName: 'Formations' },
        { id: 'r-18', title: 'Vue départementale des postes actifs', ownedByMe: false, domain: 'Collaborateurs', mainObjectName: 'Postes' },
      ],
    },
  ]);

  const homeTitle = useMemo(() => 'Rapports Lucca', []);

  const openPrototypeConfig = () => {
    setDraftPermissions(clonePermissions(permissions));
    setPrototypeConfigOpen(true);
  };

  const applyPrototypeConfig = () => {
    setPermissions(clonePermissions(draftPermissions));
    setPrototypeConfigOpen(false);
  };

  const startNewReport = () => {
    if (!permissions.CREATEREPORT) return;
    setWorkspaceMode('new');
    setConsultationReportTitle('');
    setConsultationOwnedByMe(true);
    setConsultationReportContext(null);
    setWorkspaceReportDisplayName('');
    setWorkspaceSessionId((prev) => prev + 1);
    setCurrentPage('workspace');
  };

  const openConsultationFromHome = (report: HomeReport) => {
    setWorkspaceMode('consultation');
    setConsultationReportTitle(report.title);
    setConsultationOwnedByMe(report.ownedByMe);
    setConsultationReportContext(report);
    setWorkspaceReportDisplayName(report.title);
    setWorkspaceSessionId((prev) => prev + 1);
    setCurrentPage('workspace');
  };

  const consultationIsFavorite = useMemo(() => {
    const favoriteSection = homeSections.find((section) => section.key === 'favorites');
    if (!favoriteSection) return false;

    if (consultationReportContext) {
      return favoriteSection.reports.some((report) => report.id === consultationReportContext.id);
    }

    const titleToMatch = workspaceReportDisplayName.trim();
    if (!titleToMatch) return false;
    return favoriteSection.reports.some((report) => report.title === titleToMatch);
  }, [consultationReportContext, homeSections, workspaceReportDisplayName]);

  const toggleConsultationFavorite = (reportTitle: string) => {
    const normalizedTitle = reportTitle.trim();
    if (!normalizedTitle) return;

    setHomeSections((prev) => {
      const allReports = prev.flatMap((section) => section.reports);
      const sourceReport = allReports.find((report) => report.title === normalizedTitle) ?? consultationReportContext ?? null;

      return prev.map((section) => {
        if (section.key !== 'favorites') return section;

        const alreadyFavorite = section.reports.some((report) => report.title === normalizedTitle);
        if (alreadyFavorite) {
          return {
            ...section,
            reports: section.reports.filter((report) => report.title !== normalizedTitle),
          };
        }

        const reportToAdd: HomeReport = sourceReport ?? {
          id: `favorite-${Date.now()}`,
          title: normalizedTitle,
          ownedByMe: true,
          domain: 'Collaborateurs',
          mainObjectName: normalizedTitle,
        };

        return {
          ...section,
          reports: [...section.reports, reportToAdd],
        };
      });
    });
  };

  const deleteHomeReport = (sectionKey: string, reportId: string) => {
    setHomeSections((prev) => prev.map((section) => {
      if (section.key !== sectionKey) return section;
      return {
        ...section,
        reports: section.reports.filter((report) => report.id !== reportId),
      };
    }));
  };

  const normalizedHomeReportSearchTerm = homeReportSearchTerm.trim().toLocaleLowerCase();

  const visibleHomeSections = homeSections.map((section) => ({
    ...section,
    reports: section.reports.filter((report) => {
      const matchesDomain = selectedHomeDomain ? report.domain === selectedHomeDomain : true;
      const matchesSearch = normalizedHomeReportSearchTerm
        ? report.title.toLocaleLowerCase().includes(normalizedHomeReportSearchTerm)
        : true;
      return matchesDomain && matchesSearch;
    }),
  }));

  const visibleDomainButtons = useMemo(
    () => reportDomains.filter((domain) => homeSections.some((section) => section.reports.some((report) => report.domain === domain))),
    [homeSections]
  );

  useEffect(() => {
    if (selectedHomeDomain && !visibleDomainButtons.includes(selectedHomeDomain)) {
      setSelectedHomeDomain(null);
    }
  }, [selectedHomeDomain, visibleDomainButtons]);

  const handleReportGenerated = (payload: { title: string; domain?: string; mainObjectName: string }) => {
    const normalizedTitle = payload.title.trim();
    const normalizedDomain = payload.domain?.trim() as ReportDomain | undefined;
    if (!normalizedTitle || !normalizedDomain || !reportDomains.includes(normalizedDomain)) {
      return;
    }

    setHomeSections((prev) => {
      const alreadyExists = prev.some((section) =>
        section.reports.some((report) => report.title === normalizedTitle && report.domain === normalizedDomain)
      );
      if (alreadyExists) return prev;

      const newReport: HomeReport = {
        id: `generated-${Date.now()}`,
        title: normalizedTitle,
        ownedByMe: true,
        domain: normalizedDomain,
        mainObjectName: payload.mainObjectName,
      };

      return prev.map((section) =>
        section.key === 'fresh'
          ? { ...section, reports: [newReport, ...section.reports] }
          : section
      );
    });
  };

  if (currentPage === 'workspace') {
    return (
      <div className="size-full">
        <AttributeSelector
          key={workspaceSessionId}
          startInConsultation={workspaceMode === 'consultation'}
          consultationReportTitle={consultationReportTitle || undefined}
          preferredMainObjectDomain={workspaceMode === 'new' ? (selectedHomeDomain ?? undefined) : undefined}
          consultationIsFavorite={consultationIsFavorite}
          onToggleConsultationFavorite={toggleConsultationFavorite}
          onReportDisplayNameChange={setWorkspaceReportDisplayName}
          onReportGenerated={handleReportGenerated}
          canEditReport={permissions.EDITREPORT}
          canShareReport={permissions.SHAREREPORT}
          canSendReport={permissions.SENDREPORT}
          canSaveModel={consultationOwnedByMe}
          bottomLeftActions={(
            <button
              type="button"
              onClick={openPrototypeConfig}
              className="rounded border border-dashed border-gray-400 px-2 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              conf perm.
            </button>
          )}
          topRightActions={(
            <button
              type="button"
              onClick={() => setCurrentPage('home')}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Accueil rapports
            </button>
          )}
        />

        {prototypeConfigOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Configuration prototype</h3>

              <div className="space-y-3">
                {([
                  ['CREATEREPORT', 'Créer des rapports'],
                  ['EDITREPORT', 'Editer des rapports'],
                  ['SHAREREPORT', 'Partager des rapports'],
                  ['AUTOREPORT', 'Générer automatiquement des rapports'],
                  ['SENDREPORT', 'Diffuser des rapports'],
                ] as Array<[PermissionCode, string]>).map(([code, label]) => (
                  <div key={code} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
                    <span className="text-sm text-gray-800">[{code}] {label}</span>
                    <div className="flex items-center gap-1 rounded bg-gray-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => setDraftPermissions((prev) => ({ ...prev, [code]: true }))}
                        className={`rounded px-2 py-1 text-xs ${draftPermissions[code] ? 'bg-green-600 font-medium text-white shadow-sm' : 'text-green-700 hover:bg-green-50'}`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftPermissions((prev) => ({ ...prev, [code]: false }))}
                        className={`rounded px-2 py-1 text-xs ${!draftPermissions[code] ? 'bg-red-600 font-medium text-white shadow-sm' : 'text-red-700 hover:bg-red-50'}`}
                      >
                        Non
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPrototypeConfigOpen(false)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
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

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">{homeTitle}</h1>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={openPrototypeConfig}
              className="rounded border border-dashed border-gray-400 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              conf perm.
            </button>
            {permissions.CREATEREPORT && (
              <button
                type="button"
                onClick={startNewReport}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Créer un nouveau rapport
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleDomainButtons.map((domain) => {
            const isActive = selectedHomeDomain === domain;

            return (
              <button
                key={domain}
                type="button"
                onClick={() => setSelectedHomeDomain((prev) => (prev === domain ? null : domain))}
                className={`min-h-16 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${isActive ? 'border-blue-500 bg-blue-600 text-white shadow-sm' : 'border-gray-300 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50'}`}
              >
                {domain}
              </button>
            );
          })}
        </div>

        <div className="mb-6 relative">
          <input
            type="text"
            value={homeReportSearchTerm}
            onChange={(event) => setHomeReportSearchTerm(event.target.value)}
            placeholder="Rechercher un rapport par son titre"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {homeReportSearchTerm && (
            <button
              type="button"
              onClick={() => setHomeReportSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Effacer la recherche"
              aria-label="Effacer la recherche"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="grid gap-4">
          {visibleHomeSections.map((section) => (
            <section key={section.key} className="rounded border border-gray-200 bg-white p-3">
              <h2 className="border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">{section.title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <tbody>
                    {section.reports.length === 0 ? (
                      <tr>
                        <td className="px-2 py-3 text-gray-500" colSpan={2}>Aucun résultat.</td>
                      </tr>
                    ) : (
                      section.reports.map((report) => (
                        <tr key={report.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-2 py-2 text-gray-800">
                            <div className="grid grid-cols-[13rem_minmax(0,1fr)] items-center gap-3">
                              <div>
                                <span
                                  title={`Objet principal : ${report.mainObjectName}`}
                                  className="inline-flex max-w-full rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                >
                                  {report.domain}
                                </span>
                              </div>
                              <div className="truncate">{report.title}</div>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap justify-end gap-2">
                              {section.deletable && report.ownedByMe && (
                                <button
                                  type="button"
                                  onClick={() => deleteHomeReport(section.key, report.id)}
                                  className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                                >
                                  Supprimer
                                </button>
                              )}
                              {section.key === 'bu' && (
                                <button
                                  type="button"
                                  disabled={!permissions.AUTOREPORT}
                                  className={`rounded border px-2 py-1 text-xs ${permissions.AUTOREPORT ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'}`}
                                >
                                  Génération auto
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openConsultationFromHome(report)}
                                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                Voir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>

      {prototypeConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Configuration prototype</h3>

            <div className="space-y-3">
              {([
                ['CREATEREPORT', 'Créer des rapports'],
                ['EDITREPORT', 'Editer des rapports'],
                ['SHAREREPORT', 'Partager des rapports'],
                ['AUTOREPORT', 'Générer automatiquement des rapports'],
                ['SENDREPORT', 'Diffuser des rapports'],
              ] as Array<[PermissionCode, string]>).map(([code, label]) => (
                <div key={code} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
                  <span className="text-sm text-gray-800">[{code}] {label}</span>
                  <div className="flex items-center gap-1 rounded bg-gray-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => setDraftPermissions((prev) => ({ ...prev, [code]: true }))}
                      className={`rounded px-2 py-1 text-xs ${draftPermissions[code] ? 'bg-green-600 font-medium text-white shadow-sm' : 'text-green-700 hover:bg-green-50'}`}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftPermissions((prev) => ({ ...prev, [code]: false }))}
                      className={`rounded px-2 py-1 text-xs ${!draftPermissions[code] ? 'bg-red-600 font-medium text-white shadow-sm' : 'text-red-700 hover:bg-red-50'}`}
                    >
                      Non
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrototypeConfigOpen(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
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