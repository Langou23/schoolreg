import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, FileText, Trash2, Search } from "lucide-react";
import { ApplicationsApi } from "../lib/api";
import { UserProfile, Application } from "../types";
import { isAdminLike } from "../hooks/useAuthz";

type Props = {
  user: UserProfile; // on passe l'utilisateur pour savoir quoi afficher
};

export default function ApplicationsView({ user }: Props) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filtered, setFiltered] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const canModerate = isAdminLike(user); // admin ou direction uniquement

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(
      applications.filter((a) => {
        const fn = ((a as any).firstName || (a as any).first_name || "").toLowerCase();
        const ln = ((a as any).lastName || (a as any).last_name || "").toLowerCase();
        const pe = ((a as any).parentEmail || (a as any).parent_email || "").toLowerCase();
        const pr = ((a as any).program || "").toLowerCase();
        return fn.includes(s) || ln.includes(s) || pe.includes(s) || pr.includes(s);
      })
    );
  }, [search, applications]);

  async function load() {
    setLoading(true);
    try {
      const data = await ApplicationsApi.list();
      if (Array.isArray(data)) {
        setApplications(data as any);
        setFiltered(data as any);
      } else {
        setApplications([]);
        setFiltered([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    if (!canModerate) return;
    await ApplicationsApi.approve(id);
    await load();
  }

  async function reject(id: string) {
    if (!canModerate) return;
    const reason = prompt("Raison du refus (optionnel) :") || undefined;
    await ApplicationsApi.reject(id, reason);
    await load();
  }

  async function remove(id: string) {
    if (!canModerate) return;
    if (!confirm("Supprimer définitivement cette candidature ?")) return;
    try {
      await ApplicationsApi.delete(id);
      alert("Candidature supprimée avec succès");
      await load();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de la candidature");
    }
  }

  function statusPill(status?: string) {
    const s = (status || "").toLowerCase();
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-rose-100 text-rose-800",
    };
    const cls = map[s] || "bg-gray-100 text-gray-800";
    const label =
      s === "pending" ? "En attente" : s === "approved" ? "Approuvée" : s === "rejected" ? "Refusée" : status;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>{label}</span>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inscriptions</h2>
          <p className="text-gray-600 mt-1">
            Consultation {canModerate ? "et modération" : "des candidatures (lecture seule)"}.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par nom, email parent, programme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Aucune candidature trouvée</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Élève</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programme</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((app) => {
                  const firstName = (app as any).firstName || (app as any).first_name || "";
                  const lastName = (app as any).lastName || (app as any).last_name || "";
                  const parentEmail = (app as any).parentEmail || (app as any).parent_email || "-";
                  const program = (app as any).program || "-";
                  const session = (app as any).session || "-";
                  const status = (app as any).status;

                  const canApproveReject = canModerate && String(status).toLowerCase() === "pending";
                  const canDelete = canModerate; // tu peux limiter uniquement aux refusées si tu veux

                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {lastName} {firstName}
                        </div>
                        <div className="text-sm text-gray-500">{(app as any).gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{(app as any).parentName || (app as any).parent_name}</div>
                        <div className="text-sm text-gray-500">{parentEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{program}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{statusPill(status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* Actions visibles UNIQUEMENT pour admin/direction */}
                        {canApproveReject && (
                          <>
                            <button
                              onClick={() => approve(app.id)}
                              className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 mr-3"
                              title="Approuver"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Approuver
                            </button>
                            <button
                              onClick={() => reject(app.id)}
                              className="inline-flex items-center gap-2 text-rose-700 hover:text-rose-900 mr-3"
                              title="Refuser"
                            >
                              <XCircle className="w-4 h-4" />
                              Refuser
                            </button>
                          </>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => remove(app.id)}
                            className="inline-flex items-center gap-2 text-red-600 hover:text-red-800"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                          </button>
                        )}

                        {/* Exemple d'action neutre (toujours visible) */}
                        <button
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 ml-3"
                          title="Voir le dossier"
                          onClick={() => setSelectedApp(app)}
                        >
                          <FileText className="w-4 h-4" />
                          Dossier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de détails du dossier */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Dossier de candidature
              </h2>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations de l'élève */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations de l'élève</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nom complet:</span>
                    <p className="font-medium">
                      {(selectedApp as any).lastName} {(selectedApp as any).firstName}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date de naissance:</span>
                    <p className="font-medium">
                      {(selectedApp as any).dateOfBirth 
                        ? new Date((selectedApp as any).dateOfBirth).toLocaleDateString('fr-FR')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Genre:</span>
                    <p className="font-medium">{(selectedApp as any).gender || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Programme souhaité:</span>
                    <p className="font-medium">{(selectedApp as any).program || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Session:</span>
                    <p className="font-medium">{(selectedApp as any).session || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Statut:</span>
                    <p className="font-medium">{statusPill((selectedApp as any).status)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Adresse:</span>
                    <p className="font-medium">{selectedApp.address || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Informations du parent */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations du parent/tuteur</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nom:</span>
                    <p className="font-medium">{(selectedApp as any).parentName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Téléphone:</span>
                    <p className="font-medium">{(selectedApp as any).parentPhone || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{(selectedApp as any).parentEmail || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Date de soumission */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations de soumission</h3>
                <div className="text-sm">
                  <span className="text-gray-500">Date de soumission:</span>
                  <p className="font-medium">
                    {(selectedApp as any).submittedAt 
                      ? new Date((selectedApp as any).submittedAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedApp.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedApp.notes}</p>
                </div>
              )}

              {/* Actions (uniquement pour admin/direction) */}
              {canModerate && (selectedApp as any).status === 'pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      reject(selectedApp.id);
                      setSelectedApp(null);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Refuser
                  </button>
                  <button
                    onClick={() => {
                      approve(selectedApp.id);
                      setSelectedApp(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approuver
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
