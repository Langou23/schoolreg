import { useEffect, useState } from 'react';
import type { Application } from '../types';
import { ApplicationsApi, DocumentsApi } from '../lib/api';
import { Search, CheckCircle, XCircle, Eye, FileText } from 'lucide-react';

export default function ApplicationsView() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    let filtered = applications;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app: any) => app.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter((app: any) =>
        (app.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.parentName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredApplications(filtered);
  }, [searchTerm, statusFilter, applications]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await ApplicationsApi.list();
      // Trier par date de soumission (plus récent en premier)
      const sorted = (data as any[]).sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      setApplications(sorted);
      setFilteredApplications(sorted);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (applicationId: string) => {
    try {
      const data = await DocumentsApi.listByApplication(applicationId);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    }
  };

  const handleViewDetails = async (app: Application) => {
    setSelectedApp(app);
    await fetchDocuments(app.id);
  };

  const handleApprove = async (app: Application) => {
    if (!confirm('Approuver cette inscription et créer un élève ?')) {
      return;
    }
    
    setActionLoading(true);
    
    try {
      await ApplicationsApi.approve(app.id);
      
      // Fermer le modal
      setSelectedApp(null);
      
      // Recharger la liste complète
      await fetchApplications();
      
      alert('Inscription approuvée ! L\'élève a été créé avec succès.');
    } catch (error: any) {
      console.error('Erreur lors de l\'approbation:', error);
      alert('Erreur lors de l\'approbation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (app: Application) => {
    const notes = prompt('Raison du rejet (optionnel):');
    if (notes === null) return;
    
    setActionLoading(true);
    
    try {
      await ApplicationsApi.reject(app.id, notes || undefined);
      
      // Fermer le modal
      setSelectedApp(null);
      
      // Recharger la liste complète
      await fetchApplications();
      
      alert('Inscription rejetée.');
    } catch (error: any) {
      console.error('Erreur lors du rejet:', error);
      alert('Erreur lors du rejet');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approuvée';
      case 'rejected':
        return 'Rejetée';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      birth_certificate: 'Acte de naissance',
      photo: 'Photo',
      previous_report: 'Bulletin précédent',
      medical_record: 'Dossier médical',
      other: 'Autre',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Demandes d'inscription</h2>
          <p className="text-gray-600 mt-1">Gérer les inscriptions en ligne</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Rejetées</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Aucune demande trouvée</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Élève
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Classe souhaitée
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de soumission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {(app as any).lastName} {(app as any).firstName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date((app as any).dateOfBirth).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{(app as any).parentName}</div>
                      <div className="text-sm text-gray-500">{(app as any).parentPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(app as any).program || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date((app as any).submittedAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor((app as any).status)}`}>
                        {getStatusLabel((app as any).status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(app)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Détails de l'inscription
              </h2>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations de l'élève</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nom complet:</span>
                    <p className="font-medium">{(selectedApp as any).lastName} {(selectedApp as any).firstName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date de naissance:</span>
                    <p className="font-medium">{new Date((selectedApp as any).dateOfBirth).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Genre:</span>
                    <p className="font-medium">{selectedApp.gender}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Classe souhaitée:</span>
                    <p className="font-medium">{(selectedApp as any).program || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Adresse:</span>
                    <p className="font-medium">{selectedApp.address || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations du parent</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nom:</span>
                    <p className="font-medium">{(selectedApp as any).parentName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Téléphone:</span>
                    <p className="font-medium">{(selectedApp as any).parentPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{(selectedApp as any).parentEmail || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents téléversés
                </h3>
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucun document</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{getDocumentTypeLabel(doc.type)}</p>
                          <p className="text-xs text-gray-500">{doc.fileName}</p>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Voir
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedApp.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedApp.notes}</p>
                </div>
              )}

              {selectedApp.status === 'pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => handleReject(selectedApp)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeter
                  </button>
                  <button
                    onClick={() => handleApprove(selectedApp)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLoading ? 'Approbation en cours...' : 'Approuver'}
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
